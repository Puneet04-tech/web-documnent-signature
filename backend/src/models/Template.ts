import mongoose, { Schema, Document } from 'mongoose';

export type FieldType = 'signature' | 'initials' | 'name' | 'date' | 'text' | 'input' | 'checkbox' | 'witness' | 'stamp';

export interface ITemplateField {
  type: FieldType;
  label?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  page?: number;
  required?: boolean;
}

export interface ITemplate extends Document {
  name: string;
  description?: string;
  category?: string;
  isPublic: boolean;
  fields: ITemplateField[];
  owner?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateFieldSchema: Schema = new Schema(
  {
    type: { type: String, enum: ['signature', 'initials', 'name', 'date', 'text', 'input', 'checkbox', 'witness', 'stamp'], required: true },
    label: { type: String, default: null },
    width: { type: Number, default: 150 },
    height: { type: Number, default: 50 },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    page: { type: Number, default: 1 },
    required: { type: Boolean, default: true }
  },
  { _id: false }
);

const TemplateSchema: Schema = new Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, default: null },
    category: { type: String, default: null },
    isPublic: { type: Boolean, default: false },
    fields: { type: [TemplateFieldSchema], default: [] },
    owner: { type: Schema.Types.ObjectId, ref: 'User', default: null }
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

TemplateSchema.index({ name: 'text', description: 'text' });

export default mongoose.model<ITemplate>('Template', TemplateSchema);
