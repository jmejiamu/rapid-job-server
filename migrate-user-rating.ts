import mongoose from "mongoose";
import { config } from "./src/config/db";
import User from "./src/models/User";
import Review from "./src/models/Review";

async function run() {
  await mongoose.connect(config.mongoURI, {});

  const users = await User.find({});
  console.log(`Found ${users.length} users — updating ratings...`);

  for (const u of users) {
    const stats = await Review.aggregate([
      { $match: { revieweeId: u._id } },
      {
        $group: {
          _id: "$revieweeId",
          avg: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);
    const s = stats[0] || { avg: 0, count: 0 };
    u.averageRating = s.avg || 0;
    u.reviewsCount = s.count || 0;
    await u.save();
    console.log(
      `Updated ${u._id}: avg=${u.averageRating} count=${u.reviewsCount}`
    );
  }

  console.log("Migration complete");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
