import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupMember {
  userId: mongoose.Types.ObjectId;
  email: string;
  name: string;
  role: 'leader' | 'member';
  joinedAt: Date;
  status: 'active' | 'inactive';
}

export interface ISigningGroup extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  members: IGroupMember[];
  isPublic: boolean;
  inviteCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupMemberSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
    enum: ['leader', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { _id: true });

const SigningGroupSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters']
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: {
      type: [GroupMemberSchema],
      validate: [
        {
          validator: (members: IGroupMember[]) => members.length > 0,
          message: 'At least one member is required'
        }
      ]
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true
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

SigningGroupSchema.index({ owner: 1 });
SigningGroupSchema.index({ inviteCode: 1 });
SigningGroupSchema.index({ 'members.userId': 1 });

export default mongoose.model<ISigningGroup>('SigningGroup', SigningGroupSchema);
