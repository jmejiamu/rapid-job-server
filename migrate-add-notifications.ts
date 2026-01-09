import mongoose from "mongoose";
import { config } from "./src/config/db";
import User from "./src/models/User";

async function run() {
  await mongoose.connect(config.mongoURI, {});
  console.log("Connected to MongoDB");

  // Idempotent update: only touch users where the field is missing or null
  const filter = {
    $or: [
      { notificationsEnabled: { $exists: false } },
      { notificationsEnabled: null },
    ],
  };

  const result = await User.updateMany(filter, {
    $set: { notificationsEnabled: true },
  });

  console.log(
    `Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`
  );

  await mongoose.disconnect();
  console.log("Migration complete");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
