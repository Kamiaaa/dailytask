"use client";

import { useState } from "react";
import type { TaskDTO, EmployeeDTO } from "@/types";
import { formatDate } from "@/lib/utils";

interface Props {
  task: TaskDTO;
  showAssignee?: boolean;
  /** True if the current user is the employee this task is assigned to. */
  canSubmit?: boolean;
  /** True if the current user is the department head/admin who can approve or reject. */
  canReview?: boolean;
  canDelete?: boolean;
  onChanged?: () => void;
}

const statusStyles: Record<TaskDTO["status"], string> = {
  pending: "bg-ink/5 text-ink/60",
  submitted: "bg-brass-500/10 text-brass-600",
  approved: "bg-moss-500/10 text-moss-600",
  rejected: "bg-clay/10 text-clay",
};

const statusLabels: Record<TaskDTO["status"], string> = {
  pending: "Not started",
  submitted: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected — no score",
};

export default function TaskItem({
  task,
  showAssignee,
  canSubmit,
  canReview,
  canDelete,
  onChanged,
}: Props) {
  const [busy, setBusy] = useState(false);
  const assignee = typeof task.assignedTo === "object" ? (task.assignedTo as EmployeeDTO) : null;

  async function updateStatus(status: "submitted" | "approved" | "rejected", reviewNote?: string) {
    setBusy(true);
    try {
      await fetch(`/api/tasks/${task._id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote }),
      });
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  function handleReject() {
    const note = prompt("Optional: let the employee know why this was rejected.") || "";
    updateStatus("rejected", note);
  }

  async function remove() {
    if (!confirm("Delete this task?")) return;
    setBusy(true);
    try {
      await fetch(`/api/tasks/${task._id}`, { method: "DELETE" });
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  const canEmployeeSubmit =
    canSubmit && (task.status === "pending" || task.status === "rejected");
  const canHeadReview = canReview && task.status === "submitted";

  return (
    <div className="py-3 border-b border-ink/10 last:border-none">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          <p className="text-xs text-ink/50">
            {formatDate(task.date)}
            {showAssignee && assignee ? ` · ${assignee.name}` : ""}
          </p>
        </div>

        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusStyles[task.status]}`}>
          {statusLabels[task.status]} · 1 pt
        </span>

        {canEmployeeSubmit && (
          <button
            onClick={() => updateStatus("submitted")}
            disabled={busy}
            className="btn-secondary text-xs py-1 px-2.5"
          >
            {task.status === "rejected" ? "Resubmit" : "Submit for review"}
          </button>
        )}

        {canHeadReview && (
          <div className="flex gap-2">
            <button
              onClick={() => updateStatus("approved")}
              disabled={busy}
              className="text-xs py-1 px-2.5 rounded-md bg-moss-500 text-white hover:bg-moss-600"
            >
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={busy}
              className="text-xs py-1 px-2.5 rounded-md border border-clay text-clay hover:bg-clay/5"
            >
              Reject
            </button>
          </div>
        )}

        {canDelete && (
          <button onClick={remove} disabled={busy} className="text-ink/40 hover:text-clay text-sm">
            Remove
          </button>
        )}
      </div>

      {task.status === "rejected" && task.reviewNote && (
        <p className="text-xs text-clay mt-1">Note: {task.reviewNote}</p>
      )}
    </div>
  );
}
