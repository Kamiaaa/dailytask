"use client";

import type { ScoreTrendPoint } from "@/types";

/**
 * A small month-by-month bar chart. Deliberately plain CSS/flex rather than a
 * charting dependency — there are at most ~12 bars and the project has no
 * chart library.
 */
export default function ScoreTrend({ points }: { points: ScoreTrendPoint[] }) {
  if (points.length === 0) {
    return <p className="text-ink/40 text-sm py-6">No tasks in this range yet.</p>;
  }

  // One bar per month, height proportional to the score (0-100).
  return (
    <div className="flex items-end gap-2 h-32" role="img" aria-label="Score by month">
      {points.map((point) => (
        <div key={point.month} className="flex-1 flex flex-col items-center justify-end h-full">
          <span className="text-[11px] text-ink/60 mb-1">{point.score}%</span>
          <div
            className="w-full rounded-t bg-brass-500/70 hover:bg-brass-500 transition-colors min-h-[2px]"
            style={{ height: `${Math.max(point.score, 1)}%` }}
            title={`${point.label}: ${point.totalCompleted} approved of ${point.totalAssigned} assigned`}
          />
          <span className="text-[11px] text-ink/50 mt-1 truncate w-full text-center">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  );
}
