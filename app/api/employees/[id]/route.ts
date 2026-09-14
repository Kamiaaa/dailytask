import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  const employee = await User.findById(id).select("-password");
  if (!employee) return jsonError("Employee not found.", 404);

  return jsonOk({ employee });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  const isSelf = session.userId === id;
  if (session.role !== "admin" && !isSelf) {
    return jsonError("You can only edit your own profile.", 403);
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  // Any authenticated user may update their own avatar; only admins may change role/department.
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
  if (body.name !== undefined) updates.name = body.name;
  if (session.role === "admin") {
    if (body.role !== undefined) updates.role = body.role;
    if (body.department !== undefined) updates.department = body.department;

    // Admins can reset another user's password directly (e.g. "forgot password"),
    // without needing to know the current one. Self password changes for the
    // logged-in user should go through /api/auth/change-password instead, which
    // verifies the current password first.
    if (body.password !== undefined) {
      if (typeof body.password !== "string" || body.password.length < 6) {
        return jsonError("Password must be at least 6 characters.");
      }
      updates.password = await bcrypt.hash(body.password, 10);
    }
  }

  await connectDB();
  const employee = await User.findByIdAndUpdate(id, updates, { new: true }).select("-password");
  if (!employee) return jsonError("Employee not found.", 404);

  return jsonOk({ employee });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "admin") return jsonError("Only admins can remove employees.", 403);

  await connectDB();
  const employee = await User.findByIdAndDelete(id);
  if (!employee) return jsonError("Employee not found.", 404);

  return jsonOk({ success: true });
}
