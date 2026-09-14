"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationDTO } from "@/types";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silent — notifications are a nice-to-have, not critical
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const target = notifications.find((n) => n._id === id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1));
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
  }

  async function clearAll() {
    if (notifications.length === 0) return;
    if (!confirm("Clear all notifications? This can't be undone.")) return;
    setNotifications([]);
    setUnreadCount(0);
    await fetch("/api/notifications", { method: "DELETE" });
  }

  function handleClick(n: NotificationDTO) {
    if (!n.read) markRead(n._id);
    setOpen(false);
    router.push("/dashboard/tasks");
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-md flex items-center justify-center text-ink/70 hover:bg-ink/5"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-clay" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card shadow-lg z-20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
            <p className="text-sm font-medium">Notifications</p>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-ink/50 hover:text-ink underline">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-xs text-ink/50 hover:text-clay underline">
                  Clear all
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-ink/50 p-4">No notifications yet.</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n._id} className="group relative border-b border-ink/10 last:border-none">
                  <button
                    onClick={() => handleClick(n)}
                    className={`w-full text-left pl-4 pr-9 py-3 text-sm hover:bg-ink/5 ${
                      n.read ? "text-ink/60" : "text-ink font-medium"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brass-500 mt-1.5 flex-shrink-0" />}
                      <div>
                        <p>{n.message}</p>
                        <p className="text-xs text-ink/40 mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => dismiss(n._id, e)}
                    aria-label="Dismiss notification"
                    className="absolute top-2.5 right-2 w-6 h-6 rounded-md flex items-center justify-center text-ink/40 hover:text-clay hover:bg-clay/10 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
