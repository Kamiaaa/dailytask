"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { TaskDTO, TeamDTO, EmployeeDTO } from "@/types";
import TaskItem from "@/app/components/TaskItem";
import AssignTaskForm from "@/app/components/forms/AssignTaskForm";
import { useSession } from "@/app/components/SessionProvider";

const STATUS_OPTIONS = [
  { value: "", label: "Any status" },
  { value: "pending", label: "Not started" },
  { value: "submitted", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function TasksPage() {
  const session = useSession();
  const canReview = session.role === "department_head" || session.role === "admin";

  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generateNote, setGenerateNote] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const isFirstFilterRun = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (teamFilter) params.set("team", teamFilter);
      if (employeeFilter) params.set("employee", employeeFilter);

      const [teamsRes, tasksRes] = await Promise.all([
        fetch("/api/teams"),
        fetch(`/api/tasks?${params.toString()}`),
      ]);
      const teamsData = await teamsRes.json();
      const tasksData = await tasksRes.json();
      setTeams(teamsData.teams ?? []);
      setTasks(tasksData.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, [status, dateFrom, dateTo, teamFilter, employeeFilter]);

  // On first load, department heads/admins auto-generate today's tasks from
  // any active recurring templates (safe to call repeatedly — it's idempotent).
  useEffect(() => {
    if (!canReview) {
      load();
      return;
    }
    fetch("/api/task-templates/generate", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.createdCount > 0) {
          setGenerateNote(
            `${data.createdCount} recurring task${data.createdCount === 1 ? "" : "s"} generated for today.`
          );
        }
      })
      .catch(() => {})
      .finally(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dateFrom, dateTo, teamFilter, employeeFilter]);

  const allMembers: EmployeeDTO[] = useMemo(() => {
    const activeTeam = teamFilter ? teams.find((t) => t._id === teamFilter) : null;
    const source = activeTeam ? [activeTeam] : teams;
    const map = new Map<string, EmployeeDTO>();
    source.forEach((t) => (t.members as EmployeeDTO[]).forEach((m) => map.set(m._id, m)));
    return Array.from(map.values());
  }, [teams, teamFilter]);

  const visibleTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [tasks, search]);

  const awaitingCount = useMemo(
    () => tasks.filter((t) => t.status === "submitted").length,
    [tasks]
  );

  function clearFilters() {
    setSearch("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setTeamFilter("");
    setEmployeeFilter("");
  }

  const hasActiveFilters = !!(search || status || dateFrom || dateTo || teamFilter || employeeFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl mb-1">
            {canReview ? "Assign & review tasks" : "My tasks"}
          </h1>
          <p className="text-ink/60">
            {canReview
              ? "Each task is worth 1 point — but only once you approve it."
              : "Submit a task when you're done. It counts toward your score once approved."}
          </p>
        </div>
        <div className="flex gap-2">
          {canReview && (
            <Link href="/dashboard/templates" className="btn-secondary">
              Recurring tasks
            </Link>
          )}
          {canReview && (
            <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
              {showForm ? "Close" : "Assign task"}
            </button>
          )}
        </div>
      </div>

      {generateNote && (
        <div className="card p-3 mb-6 text-sm text-moss-600 bg-moss-500/5 border-moss-500/20">
          {generateNote}
        </div>
      )}

      {canReview && showForm && (
        <div className="mb-8">
          <AssignTaskForm
            teams={teams}
            onAssigned={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      )}

      {canReview && awaitingCount > 0 && status !== "submitted" && (
        <button
          onClick={() => setStatus("submitted")}
          className="mb-4 text-sm px-3 py-1.5 rounded-md bg-brass-500/10 text-brass-600 hover:bg-brass-500/20"
        >
          {awaitingCount} task{awaitingCount === 1 ? "" : "s"} awaiting your review →
        </button>
      )}

      <div className="card p-4 mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            className="input text-sm"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
          />
          <input
            type="date"
            className="input text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
          />
        </div>

        {canReview && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <select
              className="input text-sm"
              value={teamFilter}
              onChange={(e) => {
                setTeamFilter(e.target.value);
                setEmployeeFilter("");
              }}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              className="input text-sm"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
            >
              <option value="">All employees</option>
              {allMembers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs text-ink/50 hover:text-ink underline mt-3">
            Clear filters
          </button>
        )}
      </div>

      <div className="card p-4">
        {loading ? (
          <p className="text-ink/50 p-4">Loading…</p>
        ) : visibleTasks.length === 0 ? (
          <p className="text-ink/50 p-4 text-center">
            {hasActiveFilters ? "No tasks match these filters." : "No tasks yet."}
          </p>
        ) : (
          visibleTasks.map((task) => (
            <TaskItem
              key={task._id}
              task={task}
              showAssignee={canReview}
              canSubmit={session.role === "employee"}
              canReview={canReview}
              canDelete={canReview}
              onChanged={load}
            />
          ))
        )}
      </div>
    </div>
  );
}
