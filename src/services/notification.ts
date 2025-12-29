import { Expo } from "expo-server-sdk";

interface NotificationData {
  deviceTokens: string[];
  message: string;
  title: string;
  data: any;
}

export const sendNotification = async (payload: NotificationData) => {
  const { deviceTokens, message, title, data } = payload;
  let expo = new Expo({ useFcmV1: true });

  if (
    !deviceTokens ||
    (Array.isArray(deviceTokens) && deviceTokens.length === 0)
  ) {
    console.log("[WARNING][FILE: notification.ts] No device tokens provided");
    return;
  }

  try {
    const areExpoTokens = deviceTokens.every(Expo.isExpoPushToken);
    if (!areExpoTokens) {
      console.log(" Some device tokens are not valid Expo push tokens");
      return;
    }

    const messagePayload = deviceTokens.map((token) => ({
      to: token,
      sound: "default",
      body: message || "",
      title: title || "Rapid Jobs",
      data: data,
    }));

    const chunks = expo.chunkPushNotifications(messagePayload);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = expo.sendPushNotificationsAsync(chunk);
        tickets.push(ticketChunk);
      } catch (error) {
        console.log(error);
      }
    }
  } catch (error) {
    console.log("[ERROR][FILE: notification.ts]", error);
  }
};
