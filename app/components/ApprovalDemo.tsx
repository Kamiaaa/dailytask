"use client";

import { useState } from "react";

type Status = "pending" | "submitted" | "approved" | "rejected";

const statusMeta: Record<Status, { label: string; classes: string }> = {
  pending: { label: "Not started", classes: "bg-ink/5 text-ink/60" },
  submitted: { label: "Awaiting review", classes: "bg-brass-500/10 text-brass-600" },
  approved: { label: "Approved · 1 pt", classes: "bg-moss-500/10 text-moss-600" },
  rejected: { label: "Rejected · no score", classes: "bg-clay/10 text-clay" },
};

export default function ApprovalDemo() {
  const [status, setStatus] = useState<Status>("pending");
  const [totalAssigned] = useState(4);
  const [approved, setApproved] = useState(3);

  function submit() {
    setStatus("submitted");
  }
  function approve() {
    setStatus("approved");
    setApproved((n) => n + 1);
  }
  function reject() {
    setStatus("rejected");
  }
  function resubmit() {
    setStatus("submitted");
  }
  function reset() {
    if (status === "approved") setApproved((n) => Math.max(0, n - 1));
    setStatus("pending");
  }

  const score = Math.round((approved / totalAssigned) * 100);

  return (
    <div className="card p-6">
      <p className="text-sm uppercase tracking-wide text-ink/50 mb-4">
        Try the review flow
      </p>

      <div className="border border-ink/10 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Follow up on 5 open tickets</p>
          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusMeta[status].classes}`}>
            {statusMeta[status].label}
          </span>
        </div>
        <p className="text-xs text-ink/50 mb-4">Assigned to Priya Nair · today</p>

        <div className="flex flex-wrap gap-2">
          {status === "pending" && (
            <button onClick={submit} className="btn-secondary text-xs py-1.5 px-3">
              Employee: submit for review
            </button>
          )}
          {status === "submitted" && (
            <>
              <button
                onClick={approve}
                className="text-xs py-1.5 px-3 rounded-md bg-moss-500 text-white hover:bg-moss-600"
              >
                Head: approve
              </button>
              <button
                onClick={reject}
                className="text-xs py-1.5 px-3 rounded-md border border-clay text-clay hover:bg-clay/5"
              >
                Head: reject
              </button>
            </>
          )}
          {status === "rejected" && (
            <button onClick={resubmit} className="btn-secondary text-xs py-1.5 px-3">
              Employee: resubmit
            </button>
          )}
          {status === "approved" && (
            <button onClick={reset} className="text-xs text-ink/40 hover:text-ink underline">
              Reset demo
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink/50">Priya's score</p>
          <p className="text-xs text-ink/40">
            {approved} approved / {totalAssigned} assigned
          </p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${
            score >= 80
              ? "bg-moss-500/10 text-moss-600"
              : score >= 50
              ? "bg-brass-500/10 text-brass-600"
              : "bg-clay/10 text-clay"
          }`}
        >
          {score}%
        </span>
      </div>
    </div>
  );
}
