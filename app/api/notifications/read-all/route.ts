import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

export async function PATCH() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  await Notification.updateMany({ user: session.userId, read: false }, { read: true });

  return jsonOk({ success: true });
}
