import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  const tokenPayload = { userId: payload.userId, email: payload.email, role: payload.role, name: payload.name };
  return jwt.sign(tokenPayload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry as any
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  const tokenPayload = { userId: payload.userId, email: payload.email, role: payload.role, name: payload.name };
  return jwt.sign(tokenPayload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry as any
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
};
