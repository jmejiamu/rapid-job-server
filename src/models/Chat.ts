import mongoose, { Schema, Document } from "mongoose";

export interface IChat extends Document {
  jobId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  message: string;
  timestamp: Date;
}

const ChatSchema: Schema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model<IChat>("Chat", ChatSchema);
