import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;

  await connectDB();
  const notification = await Notification.findOne({ _id: id, user: session.userId });
  if (!notification) return jsonError("Notification not found.", 404);

  notification.read = true;
  await notification.save();

  return jsonOk({ notification });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;

  await connectDB();
  const result = await Notification.deleteOne({ _id: id, user: session.userId });
  if (result.deletedCount === 0) return jsonError("Notification not found.", 404);

  return jsonOk({ success: true });
}
