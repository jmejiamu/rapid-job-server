import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  phone: string;
  name: string;
  code: string;
  isVerified: boolean;
  refreshToken?: string;
  deviceToken?: string;
}

const UserSchema: Schema = new Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  code: { type: String },
  isVerified: { type: Boolean, default: false },
  refreshToken: { type: String },
  deviceToken: { type: String },
});

export default mongoose.model<IUser>("User", UserSchema);
