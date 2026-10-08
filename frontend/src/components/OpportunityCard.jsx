import ScoreBadge from "./ScoreBadge.jsx";

const TYPE_LABELS = {
  job: "Job",
  freelance: "Freelance",
  "local business": "Local business",
  "online selling": "Online selling",
  content: "Content",
};

export default function OpportunityCard({ rank, opportunity }) {
  const breakdown = opportunity.score_breakdown || {};
  const adjustments = opportunity.adjustments || [];
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ScoreBadge score={opportunity.earn_score} />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            #{rank} · {TYPE_LABELS[opportunity.type] || opportunity.type}
          </p>
          <h3 className="text-lg font-semibold text-slate-900">{opportunity.title}</h3>
        </div>
      </div>
      <p className="mt-2 text-sm text-slate-700">{opportunity.why}</p>
      <p className="mt-2 text-sm">
        <span className="font-semibold text-slate-900">Income: {opportunity.income_estimate}</span>{" "}
        <span className="text-slate-500">(estimate, not a promise)</span>
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {(opportunity.evidence || []).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      <details className="mt-3 rounded-md bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-700">
          7-day plan
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          {(opportunity.plan_7_days || []).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </details>
      <details className="mt-2 rounded-md bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-700">
          How this score was built
        </summary>
        <dl className="mt-2 grid grid-cols-2 gap-1 text-sm text-slate-700">
          <dt>Demand</dt>
          <dd className="text-right">{breakdown.demand}</dd>
          <dt>Fit</dt>
          <dd className="text-right">{breakdown.fit}</dd>
          <dt>Trust</dt>
          <dd className="text-right">{breakdown.trust}</dd>
          <dt>Low competition</dt>
          <dd className="text-right">{breakdown.low_competition}</dd>
          <dt>Easy to start</dt>
          <dd className="text-right">{breakdown.cost_ease}</dd>
        </dl>
        {adjustments.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {adjustments.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </details>
    </article>
  );
}
