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
  postedAt: { type: Date, default: Date.now },
});

export default model("Job", jobSchema);
