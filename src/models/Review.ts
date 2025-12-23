import { Schema, model } from "mongoose";

const reviewSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
  reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  revieweeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default model("Review", reviewSchema);
