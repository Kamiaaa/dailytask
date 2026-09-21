import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";
import Team from "@/models/Team";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import {
  csvResponse,
  isISODate,
  jsonError,
  jsonOk,
  monthLabel,
  toCsv,
} from "@/lib/utils";
import type { ScoreTrendPoint } from "@/types";
import mongoose from "mongoose";

// GET /api/scores
//
// Who is included:
//   - employee:        themselves
//   - department_head: every member of the team(s) they lead (optionally ?team=)
//   - admin:           everyone (optionally ?team=)
//
// Query params:
//   team=<id>            restrict to one team
//   from=yyyy-mm-dd      only count tasks scheduled on/after this date
//   to=yyyy-mm-dd        only count tasks scheduled on/before this date
//   format=csv           download the table as a CSV file instead of JSON
//
// `from`/`to` compare against Task.date, which is stored as a "yyyy-mm-dd"
// string — so a plain string range works and stays timezone-proof.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("team");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const wantsCsv = searchParams.get("format") === "csv";

  if (fromParam && !isISODate(fromParam)) return jsonError("'from' must be a yyyy-mm-dd date.");
  if (toParam && !isISODate(toParam)) return jsonError("'to' must be a yyyy-mm-dd date.");
  if (fromParam && toParam && fromParam > toParam) {
    return jsonError("'from' must be on or before 'to'.");
  }

  const from = fromParam || null;
  const to = toParam || null;

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

  const range = { from, to };

  if (employeeIds.length === 0) {
    if (wantsCsv) {
      return csvResponse(toCsv(CSV_HEADERS, []), csvFilename(from, to));
    }
    return jsonOk({ scores: [], trend: [], range });
  }

  const objectIds = employeeIds.map((id) => new mongoose.Types.ObjectId(id));

  const dateMatch: Record<string, string> = {};
  if (from) dateMatch.$gte = from;
  if (to) dateMatch.$lte = to;

  const match: Record<string, unknown> = { assignedTo: { $in: objectIds } };
  if (from || to) match.date = dateMatch;

  const [perEmployee, perMonth] = await Promise.all([
    Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$assignedTo",
          totalAssigned: { $sum: 1 },
          totalCompleted: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
        },
      },
    ]),
    // Trend: one bucket per calendar month the tasks fall in. Task.date is a
    // "yyyy-mm-dd" string, so the first 7 characters are already the month key.
    Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $substrBytes: ["$date", 0, 7] },
          totalAssigned: { $sum: 1 },
          totalCompleted: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byId = new Map(perEmployee.map((a) => [a._id.toString(), a]));

  const employees = await User.find({ _id: { $in: objectIds } }).select("-password");

  const scores = employees.map((employee) => {
    const stats = byId.get(employee._id.toString());
    const totalAssigned = stats?.totalAssigned ?? 0;
    const totalCompleted = stats?.totalCompleted ?? 0;
    const score = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
    return { employee, totalAssigned, totalCompleted, score };
  });

  scores.sort((a, b) => b.score - a.score);

  const trend: ScoreTrendPoint[] = perMonth.map((bucket) => ({
    month: bucket._id as string,
    label: monthLabel(bucket._id as string),
    totalAssigned: bucket.totalAssigned,
    totalCompleted: bucket.totalCompleted,
    score:
      bucket.totalAssigned > 0
        ? Math.round((bucket.totalCompleted / bucket.totalAssigned) * 100)
        : 0,
  }));

  if (wantsCsv) {
    const rows = scores.map((entry) => [
      entry.employee.name,
      entry.employee.email,
      entry.employee.department,
      entry.totalAssigned,
      entry.totalCompleted,
      entry.totalAssigned - entry.totalCompleted,
      entry.score,
    ]);
    return csvResponse(toCsv(CSV_HEADERS, rows), csvFilename(from, to));
  }

  return jsonOk({ scores, trend, range });
}

const CSV_HEADERS = [
  "Employee",
  "Email",
  "Department",
  "Tasks assigned",
  "Tasks approved",
  "Not approved",
  "Score (%)",
];

function csvFilename(from: string | null, to: string | null) {
  const suffix = from || to ? `${from ?? "start"}_to_${to ?? "today"}` : "all-time";
  return `scores_${suffix}.csv`;
}
