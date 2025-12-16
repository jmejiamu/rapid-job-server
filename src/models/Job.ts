import { Schema, model } from "mongoose";

const jobSchema = new Schema({
  title: { type: String, required: true },
  pay: { type: String, required: true },
  address: { type: String, required: true },
  description: { type: String, required: true },
  images: [
    {
      original: { type: String, required: false },
      sm: { type: String, required: false },
      lg: { type: String, required: false },
    },
  ],
  category: { type: String, required: true },
  postedAt: { type: Date, default: Date.now },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

  assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: false },
  status: {
    type: String,
    enum: ["open", "approved", "completed", "closed"],
    default: "open",
  },
});

export default model("Job", jobSchema);
