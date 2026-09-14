import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Team from "@/models/Team";
import Task from "@/models/Task";
import User from "@/models/User";
import ScoreBadge from "@/app/components/ScoreBadge";
import Link from "next/link";

export default async function DashboardOverview() {
  const session = await getSession();
  if (!session) return null;

  await connectDB();

  if (session.role === "employee") {
    const [totalAssigned, totalApproved, totalAwaitingReview] = await Promise.all([
      Task.countDocuments({ assignedTo: session.userId }),
      Task.countDocuments({ assignedTo: session.userId, status: "approved" }),
      Task.countDocuments({ assignedTo: session.userId, status: "submitted" }),
    ]);
    const score = totalAssigned > 0 ? Math.round((totalApproved / totalAssigned) * 100) : 0;

    return (
      <div>
        <h1 className="font-display text-3xl mb-1">Welcome back, {session.name.split(" ")[0]}</h1>
        <p className="text-ink/60 mb-8">
          Only tasks your department head approves count toward your score.
        </p>

        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Tasks assigned" value={totalAssigned} />
          <StatCard label="Approved" value={totalApproved} />
          <StatCard label="Awaiting review" value={totalAwaitingReview} />
          <div className="card p-6">
            <p className="text-sm text-ink/50 mb-2">Score</p>
            <ScoreBadge score={score} />
          </div>
        </div>

        <Link href="/dashboard/tasks" className="btn-primary inline-block">
          View my tasks
        </Link>
      </div>
    );
  }

  if (session.role === "department_head") {
    const teams = await Team.find({ head: session.userId });
    const teamIds = teams.map((t) => t._id);
    const memberCount = teams.reduce((sum, t) => sum + t.members.length, 0);
    const [totalAssigned, totalApproved, totalAwaitingReview] = await Promise.all([
      Task.countDocuments({ team: { $in: teamIds } }),
      Task.countDocuments({ team: { $in: teamIds }, status: "approved" }),
      Task.countDocuments({ team: { $in: teamIds }, status: "submitted" }),
    ]);

    return (
      <div>
        <h1 className="font-display text-3xl mb-1">Welcome back, {session.name.split(" ")[0]}</h1>
        <p className="text-ink/60 mb-8">A snapshot of your team's activity.</p>

        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Teams" value={teams.length} />
          <StatCard label="Team members" value={memberCount} />
          <StatCard label="Approved tasks" value={totalApproved} />
          <StatCard label="Awaiting your review" value={totalAwaitingReview} highlight={totalAwaitingReview > 0} />
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard/tasks" className="btn-primary">
            {totalAwaitingReview > 0 ? "Review submissions" : "Assign a task"}
          </Link>
          <Link href="/dashboard/team" className="btn-secondary">
            Manage team
          </Link>
        </div>
      </div>
    );
  }

  // admin
  const [employeeCount, teamCount, totalAssigned, totalApproved, totalAwaitingReview] =
    await Promise.all([
      User.countDocuments({}),
      Team.countDocuments({}),
      Task.countDocuments({}),
      Task.countDocuments({ status: "approved" }),
      Task.countDocuments({ status: "submitted" }),
    ]);

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Organization overview</h1>
      <p className="text-ink/60 mb-8">Everything happening across departments.</p>

      <div className="grid sm:grid-cols-5 gap-4 mb-8">
        <StatCard label="Employees" value={employeeCount} />
        <StatCard label="Teams" value={teamCount} />
        <StatCard label="Tasks assigned" value={totalAssigned} />
        <StatCard label="Approved" value={totalApproved} />
        <StatCard label="Awaiting review" value={totalAwaitingReview} />
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/employees" className="btn-primary">
          Manage employees
        </Link>
        <Link href="/dashboard/scores" className="btn-secondary">
          View scores
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-6 ${highlight ? "border-brass-500 bg-brass-500/5" : ""}`}>
      <p className="text-sm text-ink/50 mb-1">{label}</p>
      <p className="font-display text-3xl">{value}</p>
    </div>
  );
}
