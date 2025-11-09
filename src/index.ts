import dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import routes from "./routes";
import { config } from "./config/db";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import Room from "./models/Room";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // Adjust as needed for security
    methods: ["GET", "POST"],
  },
});
export { io };

io.on("connection", (socket) => {
  socket.on(
    "joinRoom",
    async ({ roomId, userId }: { roomId: string; userId: string }) => {
      socket.join(roomId);
      console.log(`User ${userId} joined room ${roomId}`);

      // Save to DB
      try {
        const existingActiveRoom = await Room.findOne({
          userId,
          roomId,
          leftAt: null, // Only check for active (unleft) entries
        });

        if (existingActiveRoom) {
          console.log(
            `User ${userId} is already in room ${roomId}, skipping save.`
          );
          return; // Skip saving to avoid duplicates
        }

        // Save new entry only if not already active
        const userRoom = new Room({ userId, roomId });
        await userRoom.save();
      } catch (error) {
        console.error("Error saving room join:", error);
      }
    }
  );

  socket.on(
    "leaveRoom",
    async ({ roomId, userId }: { roomId: string; userId: string }) => {
      socket.leave(roomId);
      console.log(`User ${userId} left room ${roomId}`);

      // Optionally, update or delete from DB (e.g., set leftAt)
      try {
        await Room.findOneAndUpdate(
          { userId, roomId },
          { leftAt: new Date() },
          { upsert: false }
        );
      } catch (error) {
        console.error("Error updating room leave:", error);
      }
    }
  );

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api", routes);

mongoose
  .connect(config.mongoURI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));
