import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  phone: string;
  name: string;
  code: string;
  isVerified: boolean;
  refreshToken?: string;
  deviceToken?: string;
  averageRating?: number;
  reviewsCount?: number;
  notificationsEnabled?: boolean;
}

const UserSchema: Schema = new Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  code: { type: String },
  isVerified: { type: Boolean, default: false },
  refreshToken: { type: String },
  deviceToken: { type: String },
  averageRating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  notificationsEnabled: { type: Boolean, default: true },
});

export default mongoose.model<IUser>("User", UserSchema);
