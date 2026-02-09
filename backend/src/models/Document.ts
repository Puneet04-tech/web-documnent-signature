import mongoose, { Schema, Document } from 'mongoose';

export type DocumentStatus = 'draft' | 'pending' | 'partially_signed' | 'completed' | 'archived';

export interface IDocument extends Document {
  title: string;
  description?: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  owner: mongoose.Types.ObjectId;
  status: DocumentStatus;
  signedFilePath?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    fileName: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['application/pdf']
    },
    pageCount: {
      type: Number,
      default: 1
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'partially_signed', 'completed', 'archived'],
      default: 'draft'
    },
    signedFilePath: {
      type: String,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
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

DocumentSchema.index({ owner: 1, status: 1 });
DocumentSchema.index({ createdAt: -1 });

export default mongoose.model<IDocument>('Document', DocumentSchema);
