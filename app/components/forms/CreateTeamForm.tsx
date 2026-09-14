"use client";

import { useEffect, useState } from "react";
import type { EmployeeDTO } from "@/types";

export default function CreateTeamForm({ onCreated }: { onCreated?: () => void }) {
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/employees?role=employee")
      .then((r) => r.json())
      .then((data) => setEmployees(data.employees ?? []));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Give your team a name.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, memberIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create team.");
        return;
      }
      setName("");
      setSelected(new Set());
      onCreated?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div>
        <label className="block text-sm mb-1" htmlFor="teamName">
          Team name
        </label>
        <input
          id="teamName"
          className="input"
          placeholder="e.g. Support Squad"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <p className="text-sm mb-2">Add employees from the list</p>
        <div className="max-h-64 overflow-y-auto border border-ink/10 rounded-lg divide-y divide-ink/10">
          {employees.length === 0 && (
            <p className="text-sm text-ink/50 p-3">No employees available yet.</p>
          )}
          {employees.map((emp) => (
            <label
              key={emp._id}
              className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-ink/5"
            >
              <input
                type="checkbox"
                checked={selected.has(emp._id)}
                onChange={() => toggle(emp._id)}
              />
              <span className="flex-1">{emp.name}</span>
              <span className="text-ink/50">{emp.department}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-clay text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Creating…" : "Create team"}
      </button>
    </form>
  );
}
