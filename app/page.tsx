import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Team from "@/models/Team";
import Task from "@/models/Task";
import User from "@/models/User";
import TeamStatusPanel from "@/app/components/TeamStatusPanel";
import Header from "@/app/components/Header";

async function getLiveStats() {
  try {
    await connectDB();
    const [employeeCount, teamCount, approvedCount] = await Promise.all([
      User.countDocuments({}),
      Team.countDocuments({}),
      Task.countDocuments({ status: "approved" }),
    ]);
    return { employeeCount, teamCount, approvedCount };
  } catch {
    // DB not reachable (e.g. first run before MONGODB_URI is set) — fail quietly.
    return null;
  }
}

const roleCards = [
  {
    role: "Admin",
    description:
      "Sets up the organization and adds every department head and employee — no public sign-up for those roles.",
    bullets: ["Add & remove employees", "Promote to department head", "Reset passwords", "Org-wide scores"],
  },
  {
    role: "Department head",
    description:
      "Builds a team from the employee list, hands out daily tasks, and reviews what comes back.",
    bullets: ["Create a team", "Assign a 1-point task", "Approve or reject submissions", "Track team score"],
  },
  {
    role: "Employee",
    description:
      "Sees what's assigned, does the work, and submits it — the point only lands once it's approved.",
    bullets: ["View daily tasks", "Submit for review", "Resubmit if rejected", "See personal score"],
  },
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const stats = await getLiveStats();

  return (
    <main className="min-h-screen flex flex-col">
      <Header/>
      <section className="max-w-6xl mx-auto w-full px-8 grid md:grid-cols-2 gap-12 items-center py-16">
        <div>
          <h1 className="font-display text-5xl leading-[1.1] mb-6">
            A point only counts once someone signs off on it.
          </h1>
          <p className="text-lg text-ink/70 mb-8 max-w-md">
            Department heads assign daily one-point tasks to their team. Employees
            submit their work, the head approves or rejects it, and only approved
            tasks count toward the score — no self-graded homework.
          </p>
          <div className="flex gap-3 mb-8">
            <Link href="/docs" className="btn-primary">
              Explore Docs
            </Link>
            <Link href="/login" className="btn-secondary">
              I already have an account
            </Link>
          </div>

          {stats && (stats.employeeCount > 0 || stats.teamCount > 0) && (
            <div className="flex gap-8 text-sm text-ink/50 border-t border-ink/10 pt-6">
              <span>
                <strong className="text-ink font-display text-lg mr-1">{stats.employeeCount}</strong>
                people on Meridian
              </span>
              <span>
                <strong className="text-ink font-display text-lg mr-1">{stats.teamCount}</strong>
                teams
              </span>
              <span>
                <strong className="text-ink font-display text-lg mr-1">{stats.approvedCount}</strong>
                tasks approved
              </span>
            </div>
          )}
        </div>

        <TeamStatusPanel />
      </section>


      <footer className="max-w-6xl mx-auto w-full px-8 py-10 text-sm text-ink/40 border-t border-ink/10">
        Daily Task — employee task tracking with an approval step.
      </footer>
    </main>
  );
}
