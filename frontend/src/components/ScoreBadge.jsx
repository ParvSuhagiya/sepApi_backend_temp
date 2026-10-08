import { scoreColor } from "../lib/scoreColor.js";

const styles = {
  green: "bg-green-700 text-white",
  amber: "bg-amber-100 text-amber-900 border border-amber-600",
  red: "bg-red-700 text-white",
};

export default function ScoreBadge({ score }) {
  const tone = scoreColor(score);
  return (
    <span
      className={`inline-flex min-h-[40px] min-w-[64px] flex-col items-center justify-center rounded-md px-2 py-1 text-sm font-bold ${styles[tone]}`}
    >
      <span>{score}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide">EarnScore</span>
    </span>
  );
}
