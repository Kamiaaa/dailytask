import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Team from "@/models/Team";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

// GET: teams belonging to the logged-in department head, or the team an employee belongs to, or all (admin)
export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();

  let filter: Record<string, unknown> = {};
  if (session.role === "department_head") {
    filter = { head: session.userId };
  } else if (session.role === "employee") {
    filter = { members: session.userId };
  }
  // admins see all teams (empty filter)

  const teams = await Team.find(filter)
    .populate("head", "-password")
    .populate("members", "-password")
    .sort({ createdAt: -1 });

  return jsonOk({ teams });
}

// POST: department head creates a new team from the employee list
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "department_head" && session.role !== "admin") {
    return jsonError("Only department heads can create a team.", 403);
  }

  try {
    const { name, memberIds } = await req.json();
    if (!name) return jsonError("Team name is required.");

    await connectDB();

    const team = await Team.create({
      name,
      department: session.department,
      head: session.userId,
      members: Array.isArray(memberIds) ? memberIds : [],
    });

    const populated = await team.populate([
      { path: "head", select: "-password" },
      { path: "members", select: "-password" },
    ]);

    return jsonOk({ team: populated }, 201);
  } catch (err) {
    console.error(err);
    return jsonError("Something went wrong while creating the team.", 500);
  }
}
