import dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import routes from "./routes";
import { config } from "./config/db";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // Adjust as needed for security
    methods: ["GET", "POST"],
  },
});
export { io };

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
