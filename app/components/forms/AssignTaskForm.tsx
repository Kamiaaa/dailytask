"use client";

import { useState } from "react";
import type { TeamDTO, EmployeeDTO } from "@/types";
import { todayISO } from "@/lib/utils";

export default function AssignTaskForm({
  teams,
  onAssigned,
}: {
  teams: TeamDTO[];
  onAssigned?: (count: number) => void;
}) {
  const [teamId, setTeamId] = useState(teams[0]?._id ?? "");
  const [assignToAll, setAssignToAll] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeTeam = teams.find((t) => t._id === teamId);
  const members = (activeTeam?.members ?? []) as EmployeeDTO[];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!teamId || !title.trim() || !date || (!assignToAll && !assignedTo)) {
      setError("Team, title, date, and an assignee (or the whole team) are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          teamId,
          date,
          ...(assignToAll ? { assignToAll: true } : { assignedTo }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not assign task.");
        return;
      }
      setTitle("");
      setDescription("");
      onAssigned?.(assignToAll ? (data.tasks?.length ?? members.length) : 1);
    } finally {
      setLoading(false);
    }
  }

  if (teams.length === 0) {
    return (
      <div className="card p-6 text-sm text-ink/60">
        Create a team first before assigning tasks.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" htmlFor="team">
            Team
          </label>
          <select
            id="team"
            className="input"
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setAssignedTo("");
            }}
          >
            {teams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="assignee">
            Assign to
          </label>
          <select
            id="assignee"
            className="input"
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={assignToAll}
          >
            <option value="">Select employee</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={assignToAll}
          onChange={(e) => {
            setAssignToAll(e.target.checked);
            if (e.target.checked) setAssignedTo("");
          }}
        />
        Assign to the entire team ({members.length} member{members.length === 1 ? "" : "s"})
      </label>

      <div>
        <label className="block text-sm mb-1" htmlFor="title">
          Task title
        </label>
        <input
          id="title"
          className="input"
          placeholder="e.g. Follow up on 5 open tickets"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1" htmlFor="description">
          Notes (optional)
        </label>
        <textarea
          id="description"
          className="input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm mb-1" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <p className="text-sm text-ink/50">
          {assignToAll
            ? `Creates ${members.length} task${members.length === 1 ? "" : "s"}, 1 point each.`
            : "This task will be worth 1 point."}
        </p>
      </div>

      {error && <p className="text-clay text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Assigning…" : assignToAll ? "Assign to team" : "Assign task"}
      </button>
    </form>
  );
}
