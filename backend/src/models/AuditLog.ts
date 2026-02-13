import mongoose, { Schema, Document } from 'mongoose';

export type AuditAction = 
  | 'document_created'
  | 'document_viewed'
  | 'document_downloaded'
  | 'document_deleted'
  | 'document_recipients_added'
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

export interface IAuditLog extends Document {
  document?: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  signingRequest?: mongoose.Types.ObjectId;
  action: AuditAction;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
      index: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    signingRequest: {
      type: Schema.Types.ObjectId,
      ref: 'SigningRequest',
      default: null
    },
    action: {
      type: String,
      enum: [
        'document_created',
        'document_viewed',
        'document_downloaded',
        'document_deleted',
        'document_recipients_added',
        'signature_added',
        'signature_removed',
        'signature_signed',
        'signature_rejected',
        'signing_request_created',
        'signing_request_sent',
        'signing_request_viewed',
        'document_finalized',
        'user_login',
        'user_logout',
        'user_registered'
      ],
      required: true
    },
    details: {
      type: Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

AuditLogSchema.index({ document: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
