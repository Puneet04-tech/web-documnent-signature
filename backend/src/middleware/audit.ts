import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models';
import { AuthRequest } from './auth';
import { AuditAction } from '../models/AuditLog';

export interface AuditLogData {
  document?: string;
  signingRequest?: string;
  action: AuditAction;
  details?: Record<string, any>;
}

export const auditMiddleware = (logData: AuditLogData) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Store original end function
    const originalEnd = res.end.bind(res);
    
    res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
      // Only log on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          AuditLog.create({
            document: logData.document,
            user: req.user?.userId,
            signingRequest: logData.signingRequest,
            action: logData.action,
            details: {
              ...logData.details,
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode
            },
            ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            timestamp: new Date()
          }).catch(err => console.error('Audit log error:', err));
        } catch (error) {
          console.error('Audit middleware error:', error);
        }
      }
      
      // Call original end
      return originalEnd(chunk, encoding, cb);
    };
    
    next();
  };
};

// Standalone audit function for use in controllers
export const createAuditLog = async (
  data: AuditLogData & { user?: string; ipAddress: string; userAgent: string }
): Promise<void> => {
  try {
    await AuditLog.create({
      document: data.document,
      user: data.user,
      signingRequest: data.signingRequest,
      action: data.action,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
