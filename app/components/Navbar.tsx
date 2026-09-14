"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";
import NotificationBell from "@/app/components/NotificationBell";

const linksByRole: Record<string, { href: string; label: string }[]> = {
  admin: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/employees", label: "Employees" },
    { href: "/dashboard/team", label: "Teams" },
    { href: "/dashboard/tasks", label: "Tasks" },
    { href: "/dashboard/templates", label: "Recurring" },
    { href: "/dashboard/scores", label: "Scores" },
  ],
  department_head: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/team", label: "My team" },
    { href: "/dashboard/tasks", label: "Assign tasks" },
    { href: "/dashboard/templates", label: "Recurring" },
    { href: "/dashboard/scores", label: "Scores" },
  ],
  employee: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/tasks", label: "My tasks" },
    { href: "/dashboard/scores", label: "My score" },
  ],
};

export default function Navbar({ session }: { session: SessionPayload }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = linksByRole[session.role] ?? linksByRole.employee;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-ink/10 bg-paper/95 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-display text-lg">Meridian</span>
          <nav className="hidden md:flex gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm ${
                    active ? "bg-ink text-paper" : "text-ink/70 hover:bg-ink/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block mr-1">
            <p className="text-sm font-medium leading-tight">{session.name}</p>
            <p className="text-xs text-ink/50 leading-tight capitalize">
              {session.role.replace("_", " ")} · {session.department}
            </p>
          </div>
          <NotificationBell />
          <Link
            href="/dashboard/settings"
            className={`text-sm px-3 py-1.5 rounded-md ${
              pathname === "/dashboard/settings"
                ? "bg-ink text-paper"
                : "text-ink/70 hover:bg-ink/5"
            }`}
          >
            Settings
          </Link>
          <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
