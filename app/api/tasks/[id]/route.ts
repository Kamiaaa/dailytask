import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  const task = await Task.findById(id);
  if (!task) return jsonError("Task not found.", 404);

  if (session.role === "department_head") {
    const team = await Team.findById(task.team);
    if (!team || team.head.toString() !== session.userId) {
      return jsonError("You can only delete tasks you assigned.", 403);
    }
  } else if (session.role !== "admin") {
    return jsonError("You are not allowed to delete this task.", 403);
  }

  await task.deleteOne();
  return jsonOk({ success: true });
}
