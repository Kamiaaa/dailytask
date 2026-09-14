"use client";

import { useState } from "react";
import type { TeamDTO, EmployeeDTO } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TaskTemplateForm({
  teams,
  onCreated,
}: {
  teams: TeamDTO[];
  onCreated?: () => void;
}) {
  const [teamId, setTeamId] = useState(teams[0]?._id ?? "");
  const [assignToAll, setAssignToAll] = useState(true);
  const [assignedTo, setAssignedTo] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeTeam = teams.find((t) => t._id === teamId);
  const members = (activeTeam?.members ?? []) as EmployeeDTO[];

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!teamId || !title.trim() || (!assignToAll && !assignedTo)) {
      setError("Team, title, and an assignee (or the whole team) are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          teamId,
          daysOfWeek,
          ...(assignToAll ? { assignToAll: true } : { assignedTo }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create template.");
        return;
      }
      setTitle("");
      setDescription("");
      setDaysOfWeek([]);
      onCreated?.();
    } finally {
      setLoading(false);
    }
  }

  if (teams.length === 0) {
    return (
      <div className="card p-6 text-sm text-ink/60">
        Create a team first before setting up recurring tasks.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" htmlFor="tplTeam">
            Team
          </label>
          <select
            id="tplTeam"
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
          <label className="block text-sm mb-1" htmlFor="tplAssignee">
            Assign to
          </label>
          <select
            id="tplAssignee"
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
        Assign to the entire team, every time this repeats
      </label>

      <div>
        <label className="block text-sm mb-1" htmlFor="tplTitle">
          Task title
        </label>
        <input
          id="tplTitle"
          className="input"
          placeholder="e.g. Daily standup notes"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1" htmlFor="tplDescription">
          Notes (optional)
        </label>
        <textarea
          id="tplDescription"
          className="input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <p className="text-sm mb-2">Repeat on</p>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((label, i) => (
            <button
              type="button"
              key={label}
              onClick={() => toggleDay(i)}
              className={`text-xs w-10 h-8 rounded-md border ${
                daysOfWeek.includes(i)
                  ? "bg-ink text-paper border-ink"
                  : "border-ink/20 text-ink/60 hover:bg-ink/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink/50 mt-1">
          {daysOfWeek.length === 0
            ? "No days selected — this will repeat every day."
            : "Selected days only."}
        </p>
      </div>

      {error && <p className="text-clay text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Creating…" : "Create recurring task"}
      </button>
    </form>
  );
}
