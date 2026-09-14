import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";
import { notify } from "@/lib/notify";

// PATCH { status: "submitted" | "approved" | "rejected", reviewNote? }
//
// Employee (task owner): can move "pending" -> "submitted", or "rejected" -> "submitted"
//   (i.e. resubmit after a rejection). They cannot approve/reject their own task.
// Department head who owns the team / admin: can move "submitted" -> "approved"
//   or "submitted" -> "rejected". Only "approved" counts toward the employee's score.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  const task = await Task.findById(id);
  if (!task) return jsonError("Task not found.", 404);

  const isOwner = task.assignedTo.toString() === session.userId;
  let isTeamHead = false;
  let team = null;
  if (session.role === "department_head") {
    team = await Team.findById(task.team);
    isTeamHead = !!team && team.head.toString() === session.userId;
  }
  const canReview = isTeamHead || session.role === "admin";

  if (!isOwner && !canReview) {
    return jsonError("You are not allowed to update this task.", 403);
  }

  const { status, reviewNote } = await req.json();
  if (!["submitted", "approved", "rejected"].includes(status)) {
    return jsonError("status must be 'submitted', 'approved' or 'rejected'.");
  }

  if (status === "submitted") {
    if (!isOwner) {
      return jsonError("Only the assigned employee can submit this task.", 403);
    }
    if (task.status !== "pending" && task.status !== "rejected") {
      return jsonError("Only a pending or rejected task can be submitted.", 400);
    }
    task.status = "submitted";
    task.submittedAt = new Date();
    task.reviewedAt = undefined;
    task.reviewedBy = undefined;
    task.reviewNote = "";

    await task.save();

    if (!team) team = await Team.findById(task.team);
    if (team) {
      await notify({
        userId: team.head,
        type: "task_submitted",
        message: `${session.name} submitted "${task.title}" for review.`,
        taskId: task._id,
      });
    }
  } else {
    // approved / rejected
    if (!canReview) {
      return jsonError("Only your department head can approve or reject this task.", 403);
    }
    if (task.status !== "submitted") {
      return jsonError("Only a submitted task can be approved or rejected.", 400);
    }
    task.status = status;
    task.reviewedAt = new Date();
    task.reviewedBy = session.userId as unknown as typeof task.reviewedBy;
    task.reviewNote = typeof reviewNote === "string" ? reviewNote : "";

    await task.save();

    await notify({
      userId: task.assignedTo,
      type: status === "approved" ? "task_approved" : "task_rejected",
      message:
        status === "approved"
          ? `"${task.title}" was approved — +1 point.`
          : `"${task.title}" was rejected${task.reviewNote ? `: ${task.reviewNote}` : "."}`,
      taskId: task._id,
    });
  }

  const populated = await task.populate([
    { path: "assignedTo", select: "-password" },
    { path: "assignedBy", select: "-password" },
    { path: "reviewedBy", select: "-password" },
  ]);

  return jsonOk({ task: populated });
}
