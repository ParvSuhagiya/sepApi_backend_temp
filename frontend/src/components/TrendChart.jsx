import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function TrendChart({ keyword, growth, points, allGrowth }) {
  const [activeKeyword, setActiveKeyword] = useState(keyword);
  if (!points || points.length === 0) return null;

  const keywords = allGrowth ? Object.keys(allGrowth) : [];
  const showToggle = keywords.length > 1;
  const activeGrowth = allGrowth?.[activeKeyword] ?? growth;

  return (
    <section aria-label="Demand trend" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Demand trend for “{activeKeyword}”
        {typeof activeGrowth === "number" && (
          <span className="ml-2 text-sm font-normal text-slate-600">
            ({activeGrowth >= 0 ? "+" : ""}{activeGrowth}% over 12 months)
          </span>
        )}
      </h2>
      {showToggle && (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Trend keyword">
          {keywords.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKeyword(key)}
              aria-pressed={key === activeKeyword}
              className={`min-h-[40px] rounded-md border px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-700 ${
                key === activeKeyword
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis width={40} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#15803d" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
