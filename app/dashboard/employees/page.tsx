"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EmployeeDTO } from "@/types";
import { useSession } from "@/app/components/SessionProvider";

export default function EmployeesPage() {
  const session = useSession();
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    role: "employee",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data.employees ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not add employee.");
        return;
      }
      setForm({ name: "", email: "", password: "", department: "", role: "employee" });
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(id: string, role: string) {
    await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    load();
  }

  async function handleResetPassword(id: string, name: string) {
    const newPassword = prompt(`Set a new password for ${name} (min 6 characters):`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    const res = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) {
      alert(`Password updated for ${name}. Share the new password with them securely.`);
    } else {
      const data = await res.json();
      alert(data.error || "Could not reset password.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this employee? This cannot be undone.")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    load();
  }

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).sort(),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (roleFilter && emp.role !== roleFilter) return false;
      if (departmentFilter && emp.department !== departmentFilter) return false;
      if (q && !emp.name.toLowerCase().includes(q) && !emp.email.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [employees, search, roleFilter, departmentFilter]);

  const hasActiveFilters = !!(search || roleFilter || departmentFilter);

  if (session.role !== "admin") {
    return <p className="text-ink/60">Only admins can manage the employee list.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl mb-1">Employees</h1>
          <p className="text-ink/60">Add employees and department heads to the organization.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "Add employee"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4 mb-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Full name</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Temporary password</label>
              <input
                type="password"
                className="input"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Department</label>
              <input
                className="input"
                required
                value={form.department}
                onChange={(e) => update("department", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => update("role", e.target.value)}
              >
                <option value="employee">Employee</option>
                <option value="department_head">Department head</option>
              </select>
            </div>
          </div>
          {error && <p className="text-clay text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Adding…" : "Add employee"}
          </button>
        </form>
      )}

      <div className="card p-4 mb-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <input
            className="input text-sm"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            <option value="employee">Employee</option>
            <option value="department_head">Department head</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className="input text-sm"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearch("");
              setRoleFilter("");
              setDepartmentFilter("");
            }}
            className="text-xs text-ink/50 hover:text-ink underline mt-3"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-left text-ink/60">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-ink/50" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-ink/50" colSpan={5}>
                  {hasActiveFilters ? "No employees match these filters." : "No employees yet."}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp._id} className="border-t border-ink/10">
                  <td className="px-4 py-3">{emp.name}</td>
                  <td className="px-4 py-3 text-ink/60">{emp.email}</td>
                  <td className="px-4 py-3 text-ink/60">{emp.department}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input py-1"
                      value={emp.role}
                      onChange={(e) => handleRoleChange(emp._id, e.target.value)}
                    >
                      <option value="employee">Employee</option>
                      <option value="department_head">Department head</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleResetPassword(emp._id, emp.name)}
                      className="text-ink/40 hover:text-brass-600 mr-4"
                    >
                      Reset password
                    </button>
                    <button
                      onClick={() => handleDelete(emp._id)}
                      className="text-ink/40 hover:text-clay"
                    >
                      Remove
                    </button>
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
