/**
 * User Model
 * User profile & authentication
 */

import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  organization: mongoose.Types.ObjectId;
  organizationMemberships: mongoose.Types.ObjectId[];
  isActive: boolean;
  lastLogin?: Date;
  profile: {
    phone?: string;
    avatar?: string;
    timezone: string;
    activeTimer?: unknown;
    activeTimerUpdatedAt?: Date;
  };
  assignedCustomers: mongoose.Types.ObjectId[];
  accessibleLocations: mongoose.Types.ObjectId[];
  defaultBusinessLocation?: mongoose.Types.ObjectId;
  defaultWarehouseLocation?: mongoose.Types.ObjectId;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      default: "staff",
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    organizationMemberships: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Organization",
        },
      ],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    profile: {
      phone: String,
      avatar: String,
      timezone: {
        type: String,
        default: "UTC",
      },
      activeTimer: {
        type: Schema.Types.Mixed,
        default: null,
      },
      activeTimerUpdatedAt: {
        type: Date,
        default: null,
      },
    },
    assignedCustomers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Customer",
      },
    ],
    // Location access
    accessibleLocations: [
      {
        type: Schema.Types.ObjectId,
        ref: "Location",
      },
    ],
    defaultBusinessLocation: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    defaultWarehouseLocation: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    verificationCode: String,
    verificationCodeExpires: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model<IUser>("User", userSchema);

export default User;

