import mongoose, { Schema, Document } from 'mongoose';

export type FieldType = 'signature' | 'initials' | 'name' | 'date' | 'text' | 'input' | 'checkbox' | 'witness' | 'stamp';
export type FieldStatus = 'pending' | 'completed' | 'optional';

export interface ISignatureField extends Document {
  document: mongoose.Types.ObjectId;
  signer?: mongoose.Types.ObjectId;
  signingRequest?: mongoose.Types.ObjectId;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: FieldType;
  label?: string;
  placeholder?: string;
  value?: string;
  status: FieldStatus;
  required: boolean;
  linkedFieldId?: string;
  assignedTo?: string; // email of signer
  createdAt: Date;
  updatedAt: Date;
}

const SignatureFieldSchema: Schema = new Schema(
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
      default: null
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
      enum: ['signature', 'initials', 'name', 'date', 'text', 'input', 'checkbox', 'witness', 'stamp'],
      required: true
    },
    label: {
      type: String,
      default: null
    },
    placeholder: {
      type: String,
      default: null
    },
    value: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'optional'],
      default: 'pending'
    },
    required: {
      type: Boolean,
      default: true
    },
    linkedFieldId: {
      type: String,
      default: null
    },
    assignedTo: {
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

SignatureFieldSchema.index({ document: 1, page: 1 });
SignatureFieldSchema.index({ signer: 1, status: 1 });

export default mongoose.model<ISignatureField>('SignatureField', SignatureFieldSchema);
