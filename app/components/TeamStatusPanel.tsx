import { connectDB } from "@/lib/db";
import Team from "@/models/Team";
import Task from "@/models/Task";
import mongoose from "mongoose";

interface TeamStatusRow {
  teamId: string;
  name: string;
  department: string;
  memberCount: number;
  total: number;
  approved: number;
  submitted: number;
  pending: number;
  rejected: number;
}

async function getTeamTaskStatus(limit = 6): Promise<{ rows: TeamStatusRow[]; scope: "today" | "all_time" }> {
  await connectDB();

  const teams = await Team.find({}).sort({ createdAt: -1 }).limit(limit);
  if (teams.length === 0) return { rows: [], scope: "today" };

  const teamIds = teams.map((t) => t._id);
  const todayISO = new Date().toISOString().slice(0, 10);

  async function aggregateFor(filter: Record<string, unknown>) {
    return Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { team: "$team", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);
  }

  // Prefer today's tasks; if nothing has been assigned yet today, fall back to
  // all-time totals so the panel reflects real data instead of looking empty.
  let scope: "today" | "all_time" = "today";
  let agg = await aggregateFor({ team: { $in: teamIds }, date: todayISO });
  if (agg.length === 0) {
    scope = "all_time";
    agg = await aggregateFor({ team: { $in: teamIds } });
  }

  const byTeam = new Map<string, Record<string, number>>();
  for (const row of agg) {
    const teamId = (row._id.team as mongoose.Types.ObjectId).toString();
    const status = row._id.status as string;
    const existing = byTeam.get(teamId) ?? {};
    existing[status] = row.count;
    byTeam.set(teamId, existing);
  }

  const rows: TeamStatusRow[] = teams.map((team) => {
    const counts = byTeam.get(team._id.toString()) ?? {};
    const approved = counts.approved ?? 0;
    const submitted = counts.submitted ?? 0;
    const pending = counts.pending ?? 0;
    const rejected = counts.rejected ?? 0;
    return {
      teamId: team._id.toString(),
      name: team.name,
      department: team.department,
      memberCount: team.members.length,
      total: approved + submitted + pending + rejected,
      approved,
      submitted,
      pending,
      rejected,
    };
  });

  return { rows, scope };
}

export default async function TeamStatusPanel() {
  let data: { rows: TeamStatusRow[]; scope: "today" | "all_time" };
  try {
    data = await getTeamTaskStatus();
  } catch {
    // DB not reachable — render nothing rather than break the landing page.
    return null;
  }

  const { rows, scope } = data;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm uppercase tracking-wide text-ink/50">
          Team status {scope === "today" ? "· today" : ""}
        </p>
        {rows.length > 0 && (
          <span className="text-xs text-ink/40">{rows.length} team{rows.length === 1 ? "" : "s"}</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink/50">
          No teams yet — once a department head builds one, its task status shows up here.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((team) => {
            const approvedPct = team.total > 0 ? Math.round((team.approved / team.total) * 100) : 0;
            return (
              <li key={team.teamId} className="border-b border-ink/10 pb-4 last:border-none last:pb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-medium">{team.name}</p>
                    <p className="text-xs text-ink/50">
                      {team.department} · {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-moss-600">
                    {team.total > 0 ? `${team.approved}/${team.total}` : "No tasks yet"}
                  </span>
                </div>

                {team.total > 0 && (
                  <>
                    <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                      <div
                        className="h-full bg-moss-500 rounded-full"
                        style={{ width: `${approvedPct}%` }}
                      />
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-ink/50">
                      {team.submitted > 0 && <span>{team.submitted} awaiting review</span>}
                      {team.pending > 0 && <span>{team.pending} not started</span>}
                      {team.rejected > 0 && <span className="text-clay">{team.rejected} rejected</span>}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
