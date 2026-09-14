import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import TaskTemplate from "@/models/TaskTemplate";
import Team from "@/models/Team";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

// GET: templates for teams the current department head leads (admin sees all, optionally ?team=)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "department_head" && session.role !== "admin") {
    return jsonError("Only department heads can view task templates.", 403);
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("team");

  let filter: Record<string, unknown> = {};
  if (session.role === "department_head") {
    const teams = await Team.find({ head: session.userId }).select("_id");
    const teamIds = teams.map((t) => t._id);
    filter = { team: teamId ? teamId : { $in: teamIds } };
  } else if (teamId) {
    filter = { team: teamId };
  }

  const templates = await TaskTemplate.find(filter)
    .populate("assignedTo", "-password")
    .populate("createdBy", "-password")
    .sort({ createdAt: -1 });

  return jsonOk({ templates });
}

// POST: create a recurring task template
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "department_head" && session.role !== "admin") {
    return jsonError("Only department heads can create task templates.", 403);
  }

  try {
    const { title, description, teamId, assignToAll, assignedTo, daysOfWeek } = await req.json();
    if (!title || !teamId || (!assignToAll && !assignedTo)) {
      return jsonError("title, teamId, and an assignee (or assignToAll) are required.");
    }

    await connectDB();

    const team = await Team.findById(teamId);
    if (!team) return jsonError("Team not found.", 404);
    if (session.role !== "admin" && team.head.toString() !== session.userId) {
      return jsonError("You can only create templates for your own team.", 403);
    }
    if (!assignToAll && !team.members.some((m) => m.toString() === assignedTo)) {
      return jsonError("That employee is not a member of this team.", 400);
    }

    const template = await TaskTemplate.create({
      title,
      description: description || "",
      team: teamId,
      createdBy: session.userId,
      assignToAll: !!assignToAll,
      assignedTo: assignToAll ? undefined : assignedTo,
      daysOfWeek: Array.isArray(daysOfWeek) ? daysOfWeek : [],
      active: true,
    });

    const populated = await template.populate([
      { path: "assignedTo", select: "-password" },
      { path: "createdBy", select: "-password" },
    ]);

    return jsonOk({ template: populated }, 201);
  } catch (err) {
    console.error(err);
    return jsonError("Something went wrong while creating the template.", 500);
  }
}
