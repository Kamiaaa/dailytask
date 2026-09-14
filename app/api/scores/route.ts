import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";
import Team from "@/models/Team";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";
import mongoose from "mongoose";

// GET scores for:
//   - employee: their own score
//   - department_head: every member of the team(s) they lead (optionally ?team=)
//   - admin: everyone (optionally ?team=)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("team");

  let employeeIds: string[] = [];

  if (session.role === "employee") {
    employeeIds = [session.userId];
  } else if (session.role === "department_head") {
    const teamFilter = teamId ? { _id: teamId, head: session.userId } : { head: session.userId };
    const teams = await Team.find(teamFilter);
    const memberSet = new Set<string>();
    teams.forEach((t) => t.members.forEach((m) => memberSet.add(m.toString())));
    employeeIds = Array.from(memberSet);
  } else if (session.role === "admin") {
    if (teamId) {
      const team = await Team.findById(teamId);
      employeeIds = team ? team.members.map((m) => m.toString()) : [];
    } else {
      const all = await User.find({ role: "employee" }).select("_id");
      employeeIds = all.map((u) => u._id.toString());
    }
  }

  if (employeeIds.length === 0) {
    return jsonOk({ scores: [] });
  }

  const objectIds = employeeIds.map((id) => new mongoose.Types.ObjectId(id));

  const aggregation = await Task.aggregate([
    { $match: { assignedTo: { $in: objectIds } } },
    {
      $group: {
        _id: "$assignedTo",
        totalAssigned: { $sum: 1 },
        totalCompleted: {
          $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
        },
      },
    },
  ]);

  const byId = new Map(aggregation.map((a) => [a._id.toString(), a]));

  const employees = await User.find({ _id: { $in: objectIds } }).select("-password");

  const scores = employees.map((employee) => {
    const stats = byId.get(employee._id.toString());
    const totalAssigned = stats?.totalAssigned ?? 0;
    const totalCompleted = stats?.totalCompleted ?? 0;
    const score = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
    return { employee, totalAssigned, totalCompleted, score };
  });

  scores.sort((a, b) => b.score - a.score);

  return jsonOk({ scores });
}
