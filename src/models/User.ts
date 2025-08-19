import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  phone: string;
  name: string;
  code: string;
  isVerified: boolean;
}

const UserSchema: Schema = new Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  code: { type: String },
  isVerified: { type: Boolean, default: false },
});

export default mongoose.model<IUser>("User", UserSchema);
