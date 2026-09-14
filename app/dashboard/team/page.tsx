"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TeamDTO, EmployeeDTO } from "@/types";
import TeamCard from "@/app/components/TeamCard";
import CreateTeamForm from "@/app/components/forms/CreateTeamForm";

export default function TeamPage() {
  const [teams, setTeams] = useState<TeamDTO[]>([]);
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [teamsRes, employeesRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/employees?role=employee"),
      ]);
      const teamsData = await teamsRes.json();
      const employeesData = await employeesRes.json();
      setTeams(teamsData.teams ?? []);
      setEmployees(employeesData.employees ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableByTeam = useMemo(() => {
    const map = new Map<string, EmployeeDTO[]>();
    for (const team of teams) {
      const memberIds = new Set(
        team.members.map((m) => (typeof m === "object" ? m._id : m))
      );
      map.set(
        team._id,
        employees.filter((emp) => !memberIds.has(emp._id))
      );
    }
    return map;
  }, [teams, employees]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl mb-1">Your team</h1>
          <p className="text-ink/60">Build your team by adding employees from the full list.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "New team"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8">
          <CreateTeamForm
            onCreated={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : teams.length === 0 ? (
        <div className="card p-8 text-center text-ink/50">
          You haven't created a team yet. Click "New team" to get started.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {teams.map((team) => (
            <TeamCard
              key={team._id}
              team={team}
              editable
              availableEmployees={availableByTeam.get(team._id) ?? []}
              onMemberRemoved={load}
              onMemberAdded={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
