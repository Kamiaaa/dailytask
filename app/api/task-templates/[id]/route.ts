import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import TaskTemplate from "@/models/TaskTemplate";
import Team from "@/models/Team";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

async function assertOwnership(templateId: string, userId: string, role: string) {
  const template = await TaskTemplate.findById(templateId);
  if (!template) return { template: null, allowed: false };
  if (role === "admin") return { template, allowed: true };
  const team = await Team.findById(template.team);
  return { template, allowed: !!team && team.head.toString() === userId };
}

// PATCH { active: boolean } -> pause/resume a template
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;

  await connectDB();
  const { template, allowed } = await assertOwnership(id, session.userId, session.role);
  if (!template) return jsonError("Template not found.", 404);
  if (!allowed) return jsonError("You can only edit your own team's templates.", 403);

  const { active } = await req.json();
  if (typeof active === "boolean") template.active = active;
  await template.save();

  return jsonOk({ template });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const { id } = await params;

  await connectDB();
  const { template, allowed } = await assertOwnership(id, session.userId, session.role);
  if (!template) return jsonError("Template not found.", 404);
  if (!allowed) return jsonError("You can only delete your own team's templates.", 403);

  await template.deleteOne();
  return jsonOk({ success: true });
}
