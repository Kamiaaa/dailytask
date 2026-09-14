"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScoreEntry, TeamDTO } from "@/types";
import ScoreBadge from "@/app/components/ScoreBadge";
import { useSession } from "@/app/components/SessionProvider";

export default function ScoresPage() {
  const session = useSession();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [teamFilter, setTeamFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (team: string) => {
    setLoading(true);
    try {
      const url = team ? `/api/scores?team=${team}` : "/api/scores";
      const res = await fetch(url);
      const data = await res.json();
      setScores(data.scores ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session.role !== "employee") {
      fetch("/api/teams")
        .then((r) => r.json())
        .then((data) => setTeams(data.teams ?? []));
    }
    load(teamFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(teamFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl mb-1">
            {session.role === "employee" ? "My score" : "Scores"}
          </h1>
          <p className="text-ink/60">
            Score = tasks completed ÷ tasks assigned, at 1 point per task.
          </p>
        </div>
        {teams.length > 0 && (
          <select
            className="input w-56"
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
                  No task data yet.
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
