"use client";

import { useState } from "react";
import type { TeamDTO, EmployeeDTO } from "@/types";

interface Props {
  team: TeamDTO;
  editable?: boolean;
  /** Employees not currently on this team, offered in the "Add member" picker. */
  availableEmployees?: EmployeeDTO[];
  onMemberRemoved?: () => void;
  onMemberAdded?: () => void;
}

export default function TeamCard({
  team,
  editable,
  availableEmployees = [],
  onMemberRemoved,
  onMemberAdded,
}: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function removeMember(employeeId: string) {
    await fetch(`/api/teams/${team._id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId }),
    });
    onMemberRemoved?.();
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError("");
    setAdding(true);
    try {
      const res = await fetch(`/api/teams/${team._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Could not add employee.");
        return;
      }
      setSelectedId("");
      onMemberAdded?.();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-xl">{team.name}</h3>
          <p className="text-sm text-ink/50">{team.department}</p>
        </div>
        <span className="text-sm text-ink/50">{team.members.length} members</span>
      </div>

      {team.members.length === 0 ? (
        <p className="text-sm text-ink/50 mb-4">No employees added yet.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {team.members.map((member) => {
            const m = member as EmployeeDTO;
            return (
              <li key={m._id} className="flex items-center justify-between text-sm">
                <span>{m.name}</span>
                <div className="flex items-center gap-3 text-ink/50">
                  <span>{m.email}</span>
                  {editable && (
                    <button onClick={() => removeMember(m._id)} className="hover:text-clay">
                      Remove
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editable && (
        <form onSubmit={addMember} className="flex items-center gap-2 pt-4 border-t border-ink/10">
          <select
            className="input flex-1 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={availableEmployees.length === 0}
          >
            <option value="">
              {availableEmployees.length === 0
                ? "No more employees to add"
                : "Add an employee…"}
            </option>
            {availableEmployees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name} · {emp.department}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!selectedId || adding}
            className="btn-secondary text-sm py-1.5 px-3 whitespace-nowrap"
          >
            {adding ? "Adding…" : "Add member"}
          </button>
        </form>
      )}
      {error && <p className="text-clay text-xs mt-2">{error}</p>}
    </div>
  );
}
