import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Team from "@/models/Team";
import Task from "@/models/Task";
import User from "@/models/User";

import Navbar from "./Navbar";
import Header from "./Header";

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
        bullets: ["View daily tasks", "Submit with proof", "Resubmit if rejected", "See personal score"],
    },
];

export default async function Docs() {
    const session = await getSession();
    if (session) redirect("/dashboard");

    const stats = await getLiveStats();

    return (
        <main className="min-h-screen flex flex-col">
            <Header />
            <section className="max-w-6xl mx-auto w-full px-8 py-16 border-t border-ink/10">
                <h2 className="font-display text-3xl mb-2">Built around three roles</h2>
                <p className="text-ink/60 mb-10 max-w-2xl">
                    Every account belongs to exactly one of these, and each dashboard only
                    shows what that role needs.
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                    {roleCards.map((card) => (
                        <div key={card.role} className="card p-6">
                            <h3 className="font-display text-xl mb-2">{card.role}</h3>
                            <p className="text-sm text-ink/60 mb-4">{card.description}</p>
                            <ul className="space-y-2 text-sm">
                                {card.bullets.map((b) => (
                                    <li key={b} className="flex items-start gap-2">
                                        <span className="text-moss-500 mt-0.5">✓</span>
                                        <span className="text-ink/70">{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            <section className="max-w-6xl mx-auto w-full px-8 py-16 border-t border-ink/10">
                <h2 className="font-display text-3xl mb-10">How a task earns its point</h2>
                <ol className="grid md:grid-cols-4 gap-6">
                    {[
                        { step: "1", title: "Assign", body: "Head picks a team member and a date, worth 1 point." },
                        { step: "2", title: "Submit", body: "Employee submits the work, with a note or file as proof." },
                        { step: "3", title: "Review", body: "Head approves or rejects, with an optional note." },
                        { step: "4", title: "Score", body: "Approved tasks count toward completed ÷ assigned." },
                    ].map((s) => (
                        <li key={s.step} className="card p-6">
                            <span className="font-display text-3xl text-brass-500">{s.step}</span>
                            <h3 className="font-medium mt-3 mb-1">{s.title}</h3>
                            <p className="text-sm text-ink/60">{s.body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <footer className="max-w-6xl mx-auto w-full px-8 py-10 text-sm text-ink/40 border-t border-ink/10">
                Meridian — employee task tracking with an approval step.
            </footer>
        </main>
    );
}
