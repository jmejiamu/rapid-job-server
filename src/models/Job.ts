import { Schema, model } from "mongoose";

const jobSchema = new Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  postedAt: { type: Date, default: Date.now },
});

export default model("Job", jobSchema);
