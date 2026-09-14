import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Team from "@/models/Team";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

async function assertTeamOwnership(teamId: string, userId: string, role: string) {
  const team = await Team.findById(teamId);
  if (!team) return { team: null, allowed: false };
  const allowed = role === "admin" || team.head.toString() === userId;
  return { team, allowed };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  const team = await Team.findById(id)
    .populate("head", "-password")
    .populate("members", "-password");
  if (!team) return jsonError("Team not found.", 404);

  return jsonOk({ team });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  const { team, allowed } = await assertTeamOwnership(id, session.userId, session.role);
  if (!team) return jsonError("Team not found.", 404);
  if (!allowed) return jsonError("You can only edit your own team.", 403);

  const body = await req.json();
  if (body.name !== undefined) team.name = body.name;
  await team.save();

  const populated = await team.populate([
    { path: "head", select: "-password" },
    { path: "members", select: "-password" },
  ]);
  return jsonOk({ team: populated });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  const { team, allowed } = await assertTeamOwnership(id, session.userId, session.role);
  if (!team) return jsonError("Team not found.", 404);
  if (!allowed) return jsonError("You can only delete your own team.", 403);

  await team.deleteOne();
  return jsonOk({ success: true });
}
