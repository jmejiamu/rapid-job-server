import mongoose, { Schema, Document } from "mongoose";

export interface IUserRoom extends Document {
  userId: mongoose.Types.ObjectId;
  roomId: string; // e.g., jobId or userId
  joinedAt: Date;
  leftAt?: Date;
}

const UserRoomSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  roomId: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date },
});

export default mongoose.model<IUserRoom>("UserRoom", UserRoomSchema);
