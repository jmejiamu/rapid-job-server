import { Request, Response } from "express";
import Chat, { IChat } from "../models/Chat";
import Job from "../models/Job";
import { io } from "../index";

// Get chats for a specific job
export const sendMessage = async (req: Request, res: Response) => {
  const { jobId, receiverId, message } = req.body;
  const senderId = (req as any).user?.id || (req as any).user?._id;

  if (!senderId) {
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    const newMessage: IChat = new Chat({
      jobId,
      senderId,
      receiverId,
      message,
      timestamp: new Date(),
    });

    await newMessage.save();

    const chatRoomId = `${jobId}-${[senderId.toString(), receiverId?.toString()]
      .sort()
      .join("-")}`;

    io.to(senderId.toString()).emit("newMessage", newMessage);
    if (receiverId) io.to(receiverId.toString()).emit("newMessage", newMessage);
    io.to(chatRoomId).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  const { jobId, otherUserId } = req.params;
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    const chats = await Chat.find({
      jobId,
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    }).sort({ timestamp: 1 });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const getUserRooms = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: user id missing" });
  }

  try {
    // Find all chats where the user is sender or receiver
    const chats = await Chat.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).select("jobId senderId receiverId");

    // Group by unique jobId and otherUserId to avoid duplicates
    const rooms = new Map<string, { jobId: string; otherUserId: string }>();
    chats.forEach((chat) => {
      const otherUserId =
        chat.senderId.toString() === userId.toString()
          ? chat.receiverId.toString()
          : chat.senderId.toString();
      const key = `${chat.jobId}-${otherUserId}`;
      if (!rooms.has(key)) {
        rooms.set(key, { jobId: chat.jobId.toString(), otherUserId });
      }
    });

    // For each room, get the last message
    const roomList = await Promise.all(
      Array.from(rooms.values()).map(async (room) => {
        const lastMessage = await Chat.findOne({
          jobId: room.jobId,
          $or: [
            { senderId: userId, receiverId: room.otherUserId },
            { senderId: room.otherUserId, receiverId: userId },
          ],
        })
          .sort({ timestamp: -1 })
          .select("message timestamp senderId");

        const job = await Job.findById(room.jobId).select("title");

        return {
          ...room,
          jobTitle: job?.title || "",
          lastMessage: lastMessage?.message || "",
          lastMessageSenderId: lastMessage?.senderId?.toString() || "",
          timestamp: lastMessage?.timestamp || null,
        };
      })
    );
    roomList.sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bt - at; // newest first
    });

    res.json({ rooms: roomList });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
