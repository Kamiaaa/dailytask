import Notification, { NotificationType } from "@/models/Notification";
import mongoose from "mongoose";

interface NotifyInput {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  message: string;
  taskId?: string | mongoose.Types.ObjectId;
}

/** Creates a notification. Failures are logged, never thrown — a notification
 * problem should never break the underlying task action that triggered it. */
export async function notify({ userId, type, message, taskId }: NotifyInput) {
  try {
    await Notification.create({ user: userId, type, message, task: taskId });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

export async function notifyMany(inputs: NotifyInput[]) {
  await Promise.all(inputs.map((input) => notify(input)));
}
