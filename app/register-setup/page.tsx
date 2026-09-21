"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";

// Public self-registration only creates an ADMIN account for the organization.
// That admin then adds employees and department heads from the dashboard.
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl mb-1">Create your admin account</h1>
        <p className="text-ink/60 mb-8">
          This sets up your organization. Once you're in, add department heads and
          employees from the Employees page — they don't register themselves.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm mb-1" htmlFor="name">
              <User className="w-4 h-4 text-ink/50" aria-hidden="true" />
              Full name
            </label>
            <div className="relative">
              <User
                className="w-4 h-4 text-ink/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="name"
                required
                className="input"
                style={{ paddingLeft: "2.25rem" }}
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm mb-1" htmlFor="email">
              <Mail className="w-4 h-4 text-ink/50" aria-hidden="true" />
              Email
            </label>
            <div className="relative">
              <Mail
                className="w-4 h-4 text-ink/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="email"
                type="email"
                required
                className="input"
                style={{ paddingLeft: "2.25rem" }}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm mb-1" htmlFor="password">
              <Lock className="w-4 h-4 text-ink/50" aria-hidden="true" />
              Password
            </label>
            <div className="relative">
              <Lock
                className="w-4 h-4 text-ink/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                className="input"
                style={{ paddingLeft: "2.25rem", paddingRight: "2.5rem" }}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm mb-1" htmlFor="company">
              <Building2 className="w-4 h-4 text-ink/50" aria-hidden="true" />
              Company / organization name
            </label>
            <div className="relative">
              <Building2
                className="w-4 h-4 text-ink/30 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="company"
                placeholder="e.g. Acme Inc."
                className="input"
                style={{ paddingLeft: "2.25rem" }}
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-1.5 text-clay text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              <>
                Create admin account
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <p className="text-sm text-ink/60 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
