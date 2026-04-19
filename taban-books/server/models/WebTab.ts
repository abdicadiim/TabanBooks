import mongoose, { Schema, Document } from 'mongoose';

export interface IWebTab extends Document {
  name: string;
  url: string;
  isZohoApp: boolean;
  visibility: 'only-me' | 'selected' | 'everyone';
  selectedUsersAndRoles: Array<{
    id: string;
    name: string;
    type: 'user' | 'role';
  }>;
  organizationId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  status: 'Active' | 'Inactive';
  lastUpdated: Date;
}

const webTabSchema = new Schema<IWebTab>({
  name: {
    type: String,
    required: [true, 'Tab name is required'],
    trim: true,
    maxlength: [100, 'Tab name cannot exceed 100 characters']
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
    validate: {
      validator: function(v: string) {
        // URL validation regex
        const urlPattern = /^(https?:\/\/)?((([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,})|localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/[^\s]*)?$/;
        return urlPattern.test(v);
      },
      message: 'Please enter a valid URL (e.g., https://example.com or http://localhost:3000)'
    }
  },
  isZohoApp: {
    type: Boolean,
    default: false
  },
  visibility: {
    type: String,
    enum: ['only-me', 'selected', 'everyone'],
    default: 'everyone'
  },
  selectedUsersAndRoles: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['user', 'role'],
      required: true
    }
  }],
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: [true, 'Organization ID is required']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator ID is required']
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
webTabSchema.index({ organizationId: 1, createdBy: 1 });
webTabSchema.index({ status: 1 });

export default mongoose.model<IWebTab>('WebTab', webTabSchema);
