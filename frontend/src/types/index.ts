// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Document Types
export type DocumentStatus = 'draft' | 'pending' | 'partially_signed' | 'completed' | 'archived';

export interface Document {
  _id: string;
  title: string;
  description?: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  owner: string;
  status: DocumentStatus;
  signedFilePath?: string;
  createdAt: string;
  updatedAt: string;
  signatureCount?: number;
}

// Signature Types
export type SignatureType = 'drawn' | 'typed' | 'uploaded';
export type SignatureStatus = 'pending' | 'signed' | 'rejected';

export interface Signature {
  _id: string;
  document: string;
  signer: User;
  signingRequest?: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: SignatureType;
  signatureData: string;
  status: SignatureStatus;
  signedAt?: string;
  rejectReason?: string;
  createdAt: string;
}

// Signing Request Types
export type SigningOrder = 'sequential' | 'parallel';
export type SigningRequestStatus = 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
export type RequestRole = 'signer' | 'viewer' | 'approver';

export interface SignerInfo {
  _id?: string;
  email: string;
  name: string;
  role: RequestRole;
  order?: number;
  signedAt?: string;
  status: 'pending' | 'signed' | 'rejected';
}

export interface SigningRequest {
  _id: string;
  document: Document;
  owner: string;
  token: string;
  signers: SignerInfo[];
  signingOrder: SigningOrder;
  message?: string;
  subject?: string;
  status: SigningRequestStatus;
  expiresAt?: string;
  completedAt?: string;
  currentSignerIndex: number;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Audit Log Types
export type AuditAction = 
  | 'document_created'
  | 'document_viewed'
  | 'document_downloaded'
  | 'document_deleted'
  | 'signature_added'
  | 'signature_removed'
  | 'signature_signed'
  | 'signature_rejected'
  | 'signing_request_created'
  | 'signing_request_sent'
  | 'signing_request_viewed'
  | 'document_finalized'
  | 'user_login'
  | 'user_logout'
  | 'user_registered';

export interface AuditLog {
  _id: string;
  document?: Document;
  user?: User;
  signingRequest?: SigningRequest;
  action: AuditAction;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
