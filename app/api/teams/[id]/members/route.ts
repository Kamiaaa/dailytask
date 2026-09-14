import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Team from "@/models/Team";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

async function loadOwnedTeam(teamId: string, userId: string, role: string) {
  const team = await Team.findById(teamId);
  if (!team) return null;
  if (role !== "admin" && team.head.toString() !== userId) return null;
  return team;
}

// POST { employeeId } -> add a member to the team
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  const team = await loadOwnedTeam(id, session.userId, session.role);
  if (!team) return jsonError("Team not found or you don't have access.", 404);

  const { employeeId } = await req.json();
  if (!employeeId) return jsonError("employeeId is required.");

  if (!team.members.some((m) => m.toString() === employeeId)) {
    team.members.push(employeeId);
    await team.save();
  }

  const populated = await team.populate([
    { path: "head", select: "-password" },
    { path: "members", select: "-password" },
  ]);
  return jsonOk({ team: populated });
}

// DELETE { employeeId } -> remove a member from the team
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  const team = await loadOwnedTeam(id, session.userId, session.role);
  if (!team) return jsonError("Team not found or you don't have access.", 404);

  const { employeeId } = await req.json();
  if (!employeeId) return jsonError("employeeId is required.");

  team.members = team.members.filter((m) => m.toString() !== employeeId) as typeof team.members;
  await team.save();

  const populated = await team.populate([
    { path: "head", select: "-password" },
    { path: "members", select: "-password" },
  ]);
  return jsonOk({ team: populated });
}
