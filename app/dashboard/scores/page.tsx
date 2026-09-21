"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ScoreEntry, ScoreTrendPoint, TeamDTO } from "@/types";
import ScoreBadge from "@/app/components/ScoreBadge";
import ScoreTrend from "@/app/components/ScoreTrend";
import { useSession } from "@/app/components/SessionProvider";

type PresetId = "this_month" | "last_month" | "last_3_months" | "all" | "custom";

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "last_3_months", label: "Last 3 months" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
];

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Turns a preset into a {from, to} pair. "custom" is handled by the inputs. */
function presetRange(preset: PresetId): { from: string; to: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  switch (preset) {
    case "this_month":
      return { from: iso(new Date(Date.UTC(y, m, 1))), to: iso(new Date(Date.UTC(y, m + 1, 0))) };
    case "last_month":
      return { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 0))) };
    case "last_3_months":
      return { from: iso(new Date(Date.UTC(y, m - 2, 1))), to: iso(new Date(Date.UTC(y, m + 1, 0))) };
    default:
      return { from: "", to: "" };
  }
}

export default function ScoresPage() {
  const session = useSession();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [trend, setTrend] = useState<ScoreTrendPoint[]>([]);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [teamFilter, setTeamFilter] = useState("");
  const [preset, setPreset] = useState<PresetId>("this_month");
  const [custom, setCustom] = useState(() => presetRange("this_month"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The range actually sent to the API: presets compute it, "custom" reads the
  // two date inputs.
  const range = useMemo(
    () => (preset === "custom" ? custom : presetRange(preset)),
    [preset, custom]
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (teamFilter) params.set("team", teamFilter);
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    return params.toString();
  }, [teamFilter, range]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/scores?${queryString}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load scores.");
        setScores([]);
        setTrend([]);
        return;
      }
      setScores(data.scores ?? []);
      setTrend(data.trend ?? []);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    if (session.role !== "employee") {
      fetch("/api/teams")
        .then((r) => r.json())
        .then((data) => setTeams(data.teams ?? []))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // A half-finished custom range would just 400 — wait for both dates.
    if (preset === "custom" && (!custom.from || !custom.to)) return;
    load();
  }, [load, preset, custom]);

  const totals = useMemo(
    () =>
      scores.reduce(
        (acc, s) => ({
          assigned: acc.assigned + s.totalAssigned,
          completed: acc.completed + s.totalCompleted,
        }),
        { assigned: 0, completed: 0 }
      ),
    [scores]
  );
  const overallScore =
    totals.assigned > 0 ? Math.round((totals.completed / totals.assigned) * 100) : 0;

  const rangeLabel =
    range.from || range.to
      ? `${range.from || "the beginning"} → ${range.to || "today"}`
      : "all time";

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl mb-1">
            {session.role === "employee" ? "My score" : "Scores"}
          </h1>
          <p className="text-ink/60">
            Score = tasks approved ÷ tasks assigned, at 1 point per task · {rangeLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/scores?${queryString}${queryString ? "&" : ""}format=csv`}
            className="btn-secondary text-sm"
            download
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                preset === p.id
                  ? "bg-ink text-paper border-ink"
                  : "border-ink/15 text-ink/60 hover:bg-ink/5"
              }`}
            >
              {p.label}
            </button>
          ))}

          {teams.length > 0 && (
            <select
              className="input text-sm w-56 ml-auto px-3"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {preset === "custom" && (
          <div className="grid sm:grid-cols-2 gap-3 mt-3 max-w-md">
            <input
              type="date"
              className="input text-sm px-3"
              value={custom.from}
              max={custom.to || undefined}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              aria-label="From date"
            />
            <input
              type="date"
              className="input text-sm px-3"
              value={custom.to}
              min={custom.from || undefined}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              aria-label="To date"
            />
          </div>
        )}
      </div>

      {error && <div className="card p-4 mb-6 text-sm text-clay">{error}</div>}

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-6">
          <p className="text-sm text-ink/50 mb-2">
            {session.role === "employee" ? "Score for this range" : "Team score for this range"}
          </p>
          <ScoreBadge score={overallScore} />
          <p className="text-xs text-ink/50 mt-2">
            {totals.completed} approved of {totals.assigned} assigned
          </p>
        </div>
        <div className="card p-6 lg:col-span-2">
          <p className="text-sm text-ink/50 mb-3">Month-by-month trend</p>
          <ScoreTrend points={trend} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-left text-ink/60">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Completed</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
              <th className="px-4 py-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-ink/50" colSpan={4}>
                  Loading…
                </td>
              </tr>
            ) : scores.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-ink/50" colSpan={4}>
                  No task data in this range.
                </td>
              </tr>
            ) : (
              scores.map((entry) => (
                <tr key={entry.employee._id} className="border-t border-ink/10">
                  <td className="px-4 py-3">
                    <p className="font-medium">{entry.employee.name}</p>
                    <p className="text-ink/50 text-xs">{entry.employee.department}</p>
                  </td>
                  <td className="px-4 py-3">{entry.totalCompleted}</td>
                  <td className="px-4 py-3">{entry.totalAssigned}</td>
                  <td className="px-4 py-3">
                    <ScoreBadge score={entry.score} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
