import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: session.userId }).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ user: session.userId, read: false }),
  ]);

  return jsonOk({ notifications, unreadCount });
}

// DELETE: clear every notification for the current user
export async function DELETE() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  await Notification.deleteMany({ user: session.userId });

  return jsonOk({ success: true });
}
