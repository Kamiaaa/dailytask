export default function ScoreBadge({ score }: { score: number }) {
  let classes = "bg-clay/10 text-clay";
  if (score >= 80) classes = "bg-moss-500/10 text-moss-600";
  else if (score >= 50) classes = "bg-brass-500/10 text-brass-600";

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${classes}`}>
      {score}%
    </span>
  );
}
