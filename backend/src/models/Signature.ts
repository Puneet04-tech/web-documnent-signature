import mongoose, { Schema, Document } from 'mongoose';

export type SignatureType = 'drawn' | 'typed' | 'uploaded';
export type SignatureStatus = 'pending' | 'signed' | 'rejected';

export interface ISignature extends Document {
  document: mongoose.Types.ObjectId;
  signer: mongoose.Types.ObjectId;
  signingRequest?: mongoose.Types.ObjectId;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: SignatureType;
  signatureData: string;
  status: SignatureStatus;
  signedAt?: Date;
  rejectReason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SignatureSchema: Schema = new Schema(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    signer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    signingRequest: {
      type: Schema.Types.ObjectId,
      ref: 'SigningRequest',
      default: null
    },
    page: {
      type: Number,
      required: true,
      min: 1
    },
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    },
    width: {
      type: Number,
      default: 150
    },
    height: {
      type: Number,
      default: 50
    },
    type: {
      type: String,
      enum: ['drawn', 'typed', 'uploaded'],
      required: true
    },
    signatureData: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'signed', 'rejected'],
      default: 'pending'
    },
    signedAt: {
      type: Date,
      default: null
    },
    rejectReason: {
      type: String,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
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

SignatureSchema.index({ document: 1, status: 1 });
SignatureSchema.index({ signer: 1 });

export default mongoose.model<ISignature>('Signature', SignatureSchema);
