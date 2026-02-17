import mongoose, { Schema, Document } from 'mongoose';

export type SigningOrder = 'sequential' | 'parallel';
export type SigningRequestStatus = 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';
export type RequestRole = 'signer' | 'viewer' | 'approver';

export interface ISignerInfo {
  email: string;
  name: string;
  role: RequestRole;
  order?: number;
  signedAt?: Date;
  status: 'pending' | 'signed' | 'rejected';
}

export interface IGroupSigning {
  enabled: boolean;
  groupId?: mongoose.Types.ObjectId;
}

export interface ISigningRequest extends Document {
  document: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  token: string;
  signers: ISignerInfo[];
  signingOrder: SigningOrder;
  message?: string;
  subject?: string;
  status: SigningRequestStatus;
  expiresAt?: Date;
  completedAt?: Date;
  currentSignerIndex: number;
  reminderSentAt?: Date;
  groupSigning?: IGroupSigning;
  createdAt: Date;
  updatedAt: Date;
}

const SignerInfoSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['signer', 'viewer', 'approver'],
    default: 'signer'
  },
  order: {
    type: Number,
    default: 0
  },
  signedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'signed', 'rejected'],
    default: 'pending'
  }
}, { _id: true });

const SigningRequestSchema: Schema = new Schema(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    signers: {
      type: [SignerInfoSchema],
      validate: [
        {
          validator: (signers: ISignerInfo[]) => signers.length > 0,
          message: 'At least one signer is required'
        }
      ]
    },
    signingOrder: {
      type: String,
      enum: ['sequential', 'parallel'],
      default: 'parallel'
    },
    message: {
      type: String,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    subject: {
      type: String,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'expired', 'cancelled'],
      default: 'pending'
    },
    expiresAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    currentSignerIndex: {
      type: Number,
      default: 0
    },
    reminderSentAt: {
      type: Date,
      default: null
    },
    groupSigning: {
      enabled: {
        type: Boolean,
        default: false
      },
      groupId: {
        type: Schema.Types.ObjectId,
        ref: 'SigningGroup',
        default: null
      }
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

SigningRequestSchema.index({ document: 1, status: 1 });
SigningRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ISigningRequest>('SigningRequest', SigningRequestSchema);
