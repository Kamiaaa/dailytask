import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";
import Team from "@/models/Team";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";
import { notifyMany } from "@/lib/notify";

// GET: tasks scoped to the current user, with optional search/filter params:
//   ?team=       team id (department head/admin)
//   ?employee=   assignee id (department head/admin)
//   ?date=       exact ISO date
//   ?dateFrom=   ISO date, inclusive lower bound (used if ?date is absent)
//   ?dateTo=     ISO date, inclusive upper bound (used if ?date is absent)
//   ?status=     "pending" | "submitted" | "approved" | "rejected"
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("team");
  const date = searchParams.get("date");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const employeeId = searchParams.get("employee");
  const status = searchParams.get("status");

  const filter: Record<string, unknown> = {};

  if (date) {
    filter.date = date;
  } else if (dateFrom || dateTo) {
    const range: Record<string, string> = {};
    if (dateFrom) range.$gte = dateFrom;
    if (dateTo) range.$lte = dateTo;
    filter.date = range;
  }

  if (status && ["pending", "submitted", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }

  if (session.role === "employee") {
    filter.assignedTo = session.userId;
  } else if (session.role === "department_head") {
    const teams = await Team.find({ head: session.userId }).select("_id");
    const teamIds = teams.map((t) => t._id);
    filter.team = teamId ? teamId : { $in: teamIds };
    if (employeeId) filter.assignedTo = employeeId;
  } else if (session.role === "admin") {
    if (teamId) filter.team = teamId;
    if (employeeId) filter.assignedTo = employeeId;
  }

  const tasks = await Task.find(filter)
    .populate("assignedTo", "-password")
    .populate("assignedBy", "-password")
    .sort({ date: -1, createdAt: -1 });

  return jsonOk({ tasks });
}

// POST: department head assigns a task (worth 1 point).
//   - assignedTo: a single employee id, OR
//   - assignToAll: true, to assign the same task to every current team member
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "department_head" && session.role !== "admin") {
    return jsonError("Only department heads can assign tasks.", 403);
  }

  try {
    const { title, description, teamId, assignedTo, assignToAll, date } = await req.json();
    if (!title || !teamId || !date || (!assignedTo && !assignToAll)) {
      return jsonError("title, teamId, date, and an assignee (or assignToAll) are required.");
    }

    await connectDB();

    const team = await Team.findById(teamId);
    if (!team) return jsonError("Team not found.", 404);
    if (session.role !== "admin" && team.head.toString() !== session.userId) {
      return jsonError("You can only assign tasks within your own team.", 403);
    }

    const targetIds: string[] = assignToAll
      ? team.members.map((m) => m.toString())
      : [assignedTo];

    if (targetIds.length === 0) {
      return jsonError("This team has no members to assign to yet.", 400);
    }
    if (!assignToAll && !team.members.some((m) => m.toString() === assignedTo)) {
      return jsonError("That employee is not a member of this team.", 400);
    }

    const created = await Task.insertMany(
      targetIds.map((employeeId) => ({
        title,
        description: description || "",
        team: teamId,
        assignedTo: employeeId,
        assignedBy: session.userId,
        date,
        status: "pending",
        points: 1,
      }))
    );

    await notifyMany(
      created.map((task) => ({
        userId: task.assignedTo,
        type: "task_assigned" as const,
        message: `New task assigned: "${title}"`,
        taskId: task._id,
      }))
    );

    const populated = await Task.find({ _id: { $in: created.map((t) => t._id) } })
      .populate("assignedTo", "-password")
      .populate("assignedBy", "-password");

    return jsonOk(
      assignToAll ? { tasks: populated } : { task: populated[0] },
      201
    );
  } catch (err) {
    console.error(err);
    return jsonError("Something went wrong while assigning the task.", 500);
  }
}
