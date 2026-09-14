"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaskTemplateDTO, TeamDTO, EmployeeDTO } from "@/types";
import TaskTemplateForm from "@/app/components/forms/TaskTemplateForm";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplateDTO[]>([]);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, templatesRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/task-templates"),
      ]);
      const teamsData = await teamsRes.json();
      const templatesData = await templatesRes.json();
      setTeams(teamsData.teams ?? []);
      setTemplates(templatesData.templates ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/task-templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this recurring task? It won't remove tasks already generated.")) return;
    await fetch(`/api/task-templates/${id}`, { method: "DELETE" });
    load();
  }

  function teamName(teamId: string) {
    return teams.find((t) => t._id === teamId)?.name ?? "—";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl mb-1">Recurring tasks</h1>
          <p className="text-ink/60">
            Set these up once — each active template automatically creates today's task the
            next time you (or a teammate) open the Tasks page.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "New recurring task"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8">
          <TaskTemplateForm
            teams={teams}
            onCreated={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : templates.length === 0 ? (
        <div className="card p-8 text-center text-ink/50">
          No recurring tasks yet. Click "New recurring task" to automate daily assignments.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-left text-ink/60">
              <tr>
                <th className="px-4 py-3 font-medium">Task</th>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Repeats</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => {
                const assignee = tpl.assignToAll
                  ? "Entire team"
                  : (tpl.assignedTo as EmployeeDTO)?.name ?? "—";
                const repeats =
                  tpl.daysOfWeek.length === 0
                    ? "Every day"
                    : tpl.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ");
                return (
                  <tr key={tpl._id} className="border-t border-ink/10">
                    <td className="px-4 py-3">
                      <p className="font-medium">{tpl.title}</p>
                      {tpl.lastGeneratedDate && (
                        <p className="text-xs text-ink/40">Last generated {tpl.lastGeneratedDate}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink/60">{teamName(tpl.team)}</td>
                    <td className="px-4 py-3 text-ink/60">{assignee}</td>
                    <td className="px-4 py-3 text-ink/60">{repeats}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          tpl.active ? "bg-moss-500/10 text-moss-600" : "bg-ink/5 text-ink/50"
                        }`}
                      >
                        {tpl.active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(tpl._id, tpl.active)}
                        className="text-ink/40 hover:text-ink mr-4"
                      >
                        {tpl.active ? "Pause" : "Resume"}
                      </button>
                      <button onClick={() => remove(tpl._id)} className="text-ink/40 hover:text-clay">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
