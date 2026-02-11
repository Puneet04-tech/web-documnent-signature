import mongoose, { Schema, Document } from 'mongoose';

export type RecipientRole = 'signer' | 'witness' | 'reviewer';
export type RecipientStatus = 'pending' | 'signed' | 'declined' | 'completed';

export interface IDocumentRecipient extends Document {
  document: mongoose.Types.ObjectId;
  email: string;
  name: string;
  role: RecipientRole;
  status: RecipientStatus;
  order: number;
  signingRequest?: mongoose.Types.ObjectId;
  signedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  witnessFor?: mongoose.Types.ObjectId; // If this witness is witnessing another signer
  message?: string; // Optional message for recipient
  createdAt: Date;
  updatedAt: Date;
}

const DocumentRecipientSchema: Schema = new Schema(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['signer', 'witness', 'reviewer'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'signed', 'declined', 'completed'],
      default: 'pending'
    },
    order: {
      type: Number,
      required: true,
      default: 0
    },
    signingRequest: {
      type: Schema.Types.ObjectId,
      ref: 'SigningRequest',
      default: null
    },
    signedAt: {
      type: Date,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    witnessFor: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentRecipient',
      default: null
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc: any, ret: any) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

DocumentRecipientSchema.index({ document: 1, email: 1 });
DocumentRecipientSchema.index({ signingRequest: 1 });
DocumentRecipientSchema.index({ status: 1 });

export default mongoose.model<IDocumentRecipient>('DocumentRecipient', DocumentRecipientSchema);
