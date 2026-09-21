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

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // keep in sync with /api/upload

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
  const [openSubmit, setOpenSubmit] = useState(false);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const assignee = typeof task.assignedTo === "object" ? (task.assignedTo as EmployeeDTO) : null;

  function fileToDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${task._id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Something went wrong.");
    }
  }

  async function submitWithProof() {
    setError("");
    if (file && file.size > MAX_UPLOAD_BYTES) {
      setError("That file is larger than 10 MB.");
      return;
    }
    setBusy(true);
    try {
      let proof: { url: string; type: "image" | "file" } | null = null;

      if (file) {
        const dataUrl = await fileToDataUrl(file);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: dataUrl, kind: "proof" }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadData.error || "Upload failed.");
          return;
        }
        proof = { url: uploadData.url, type: uploadData.type };
      }

      await patch({
        status: "submitted",
        proofNote: note,
        ...(proof ? { proofUrl: proof.url, proofName: file?.name, proofType: proof.type } : {}),
      });

      setOpenSubmit(false);
      setNote("");
      setFile(null);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function review(status: "approved" | "rejected", reviewNote?: string) {
    setError("");
    setBusy(true);
    try {
      await patch({ status, reviewNote });
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function handleReject() {
    const reason = prompt("Optional: let the employee know why this was rejected.") || "";
    review("rejected", reason);
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

  const canEmployeeSubmit = canSubmit && (task.status === "pending" || task.status === "rejected");
  const canHeadReview = canReview && task.status === "submitted";
  const hasProof = !!(task.proofUrl || task.proofNote);

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

        <span
          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusStyles[task.status]}`}
        >
          {statusLabels[task.status]} · 1 pt
        </span>

        {canEmployeeSubmit && (
          <button
            onClick={() => setOpenSubmit((s) => !s)}
            disabled={busy}
            className="btn-secondary text-xs py-1 px-2.5"
          >
            {openSubmit ? "Cancel" : task.status === "rejected" ? "Resubmit" : "Submit for review"}
          </button>
        )}

        {canHeadReview && (
          <div className="flex gap-2">
            <button
              onClick={() => review("approved")}
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

      {/* What the employee attached — visible to them and to the reviewer. */}
      {hasProof && !openSubmit && (
        <div className="mt-2 ml-0 text-xs bg-ink/[0.03] border border-ink/10 rounded-md px-3 py-2">
          {task.proofNote && <p className="text-ink/70 whitespace-pre-wrap">{task.proofNote}</p>}
          {task.proofUrl && (
            <a
              href={task.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brass-600 hover:underline mt-1"
            >
              {task.proofType === "image" ? "View attached image" : "Download attachment"}
              {task.proofName ? ` · ${task.proofName}` : ""}
            </a>
          )}
        </div>
      )}

      {openSubmit && (
        <div className="mt-3 border border-ink/10 rounded-md p-3 bg-white">
          <label className="block text-xs text-ink/60 mb-1" htmlFor={`note-${task._id}`}>
            What did you do? (optional)
          </label>
          <textarea
            id={`note-${task._id}`}
            className="input text-sm px-3 py-2 mb-3"
            rows={3}
            maxLength={1000}
            placeholder="A short note for your department head…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex items-center gap-3 flex-wrap">
            <label className="btn-secondary text-xs py-1 px-2.5 cursor-pointer inline-block">
              {file ? "Change file" : "Attach proof"}
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {file && (
              <span className="text-xs text-ink/60 truncate max-w-[16rem]">
                {file.name}
                <button
                  onClick={() => setFile(null)}
                  className="ml-2 text-ink/40 hover:text-clay"
                  type="button"
                >
                  remove
                </button>
              </span>
            )}
            <button
              onClick={submitWithProof}
              disabled={busy}
              className="btn-primary text-xs py-1.5 px-3 ml-auto"
            >
              {busy ? "Submitting…" : "Send for review"}
            </button>
          </div>

          <p className="text-[11px] text-ink/40 mt-2">
            Images, PDFs and documents up to 10 MB. Both the note and the file are optional.
          </p>
        </div>
      )}

      {error && <p className="text-xs text-clay mt-1">{error}</p>}

      {task.status === "rejected" && task.reviewNote && (
        <p className="text-xs text-clay mt-1">Note: {task.reviewNote}</p>
      )}
    </div>
  );
}
