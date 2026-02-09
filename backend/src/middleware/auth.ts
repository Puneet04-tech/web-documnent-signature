import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { User } from '../models';

export interface AuthRequest extends Request {
  user?: TokenPayload & { _id: string; name?: string };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Access token required' });
      return;
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      res.status(401).json({ success: false, message: 'Access token required' });
      return;
    }
    
    const decoded = verifyAccessToken(token);
    
    // Verify user still exists and is active
    const user = await User.findById(decoded.userId).select('_id isActive');
    
    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }
    
    if (!user.isActive) {
      res.status(401).json({ success: false, message: 'Account is deactivated' });
      return;
    }
    
    req.user = { ...decoded, _id: decoded.userId, name: decoded.name, email: decoded.email };
    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expired' });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      next();
      return;
    }
    
    const decoded = verifyAccessToken(token);
    req.user = { ...decoded, _id: decoded.userId };
    next();
  } catch {
    next();
  }
};
