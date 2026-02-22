import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../utils/errorHandler';
import { Document } from '../models';
import { SigningRequest } from '../models';
import { DocumentRecipient } from '../models';

// Get document analytics
export const getDocumentAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { documentId } = req.params;
  const { timeRange = '30d' } = req.query;
  const userId = req.user!._id;

  // Verify document exists and user has access
  const document = await Document.findOne({
    _id: documentId,
    $or: [
      { owner: userId },
      { 'collaborators.userId': userId }
    ]
  });

  if (!document) {
    throw new AppError('Document not found', 404);
  }

  // Calculate time range
  const now = new Date();
  const timeRangeMs = timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                      timeRange === '30d' ? 30 * 24 * 60 * 60 * 1000 :
                      timeRange === '90d' ? 90 * 24 * 60 * 60 * 1000 :
                      30 * 24 * 60 * 60 * 1000; // default to 30 days

  const startDate = new Date(now.getTime() - timeRangeMs);

  // Get signing requests for this document
  const signingRequests = await SigningRequest.find({
    document: documentId,
    createdAt: { $gte: startDate }
  }).populate('signers.userId', 'name email');

  // Get document recipients
  const recipients = await DocumentRecipient.find({
    document: documentId,
    createdAt: { $gte: startDate }
  });

  // Calculate analytics
  const totalSigners = signingRequests.reduce((acc, sr) => acc + sr.signers.length, 0) + recipients.length;
  const completedSigners = signingRequests.reduce((acc, sr) => 
    acc + sr.signers.filter(s => s.status === 'completed').length, 0) + 
    recipients.filter(r => r.status === 'signed').length;
  const pendingSigners = totalSigners - completedSigners;

  // Generate daily data for charts
  const dailyData = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
    const nextDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
    
    const dailyRequests = signingRequests.filter(sr => 
      sr.createdAt >= date && sr.createdAt < nextDate
    ).length;
    
    const dailyCompleted = signingRequests.filter(sr => 
      sr.signers.some(s => s.status === 'completed' && 
        s.updatedAt >= date && s.updatedAt < nextDate)
    ).length;

    dailyData.push({
      date: date.toISOString().split('T')[0],
      requests: dailyRequests,
      completed: dailyCompleted
    });
  }

  const analytics = {
    document: {
      id: document._id,
      title: document.title,
      status: document.status,
      createdAt: document.createdAt
    },
    summary: {
      totalSigners,
      completedSigners,
      pendingSigners,
      completionRate: totalSigners > 0 ? Math.round((completedSigners / totalSigners) * 100) : 0,
      averageTimeToComplete: calculateAverageCompletionTime(signingRequests)
    },
    dailyData,
    timeRange,
    generatedAt: new Date()
  };

  res.json({
    success: true,
    data: analytics
  });
});

// Get overall analytics for user
export const getUserAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { timeRange = '30d' } = req.query;
  const userId = req.user!._id;

  // Calculate time range
  const now = new Date();
  const timeRangeMs = timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                      timeRange === '30d' ? 30 * 24 * 60 * 60 * 1000 :
                      timeRange === '90d' ? 90 * 24 * 60 * 60 * 1000 :
                      30 * 24 * 60 * 60 * 1000;
  const startDate = new Date(now.getTime() - timeRangeMs);

  // Get user's documents
  const documents = await Document.find({
    owner: userId,
    createdAt: { $gte: startDate }
  });

  // Get all signing requests for user's documents
  const signingRequests = await SigningRequest.find({
    document: { $in: documents.map(d => d._id) },
    createdAt: { $gte: startDate }
  });

  // Calculate summary
  const totalDocuments = documents.length;
  const completedDocuments = documents.filter(d => d.status === 'completed').length;
  const pendingDocuments = documents.filter(d => d.status === 'pending').length;
  const totalRequests = signingRequests.length;
  const completedRequests = signingRequests.filter(sr => 
    sr.status === 'completed' || sr.signers.every(s => s.status === 'completed')
  ).length;

  res.json({
    success: true,
    data: {
      summary: {
        totalDocuments,
        completedDocuments,
        pendingDocuments,
        totalRequests,
        completedRequests,
        documentCompletionRate: totalDocuments > 0 ? Math.round((completedDocuments / totalDocuments) * 100) : 0
      },
      timeRange,
      generatedAt: new Date()
    }
  });
});

// Helper function to calculate average completion time
function calculateAverageCompletionTime(signingRequests: any[]): number {
  const completedRequests = signingRequests.filter(sr => 
    sr.signers.some(s => s.status === 'completed')
  );

  if (completedRequests.length === 0) return 0;

  const totalTime = completedRequests.reduce((acc, sr) => {
    const firstSigner = sr.signers.find(s => s.status === 'completed');
    if (firstSigner && firstSigner.updatedAt) {
      return acc + (firstSigner.updatedAt.getTime() - sr.createdAt.getTime());
    }
    return acc;
  }, 0);

  return Math.round(totalTime / completedRequests.length / (1000 * 60 * 60)); // Convert to hours
}

export const analyticsController = {
  getDocumentAnalytics,
  getUserAnalytics
};
