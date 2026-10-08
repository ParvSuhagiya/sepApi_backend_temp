import OutreachButton from "./OutreachButton.jsx";
import ScoreBadge from "./ScoreBadge.jsx";

function priceLabel(level) {
  if (level == null) return null;
  const value = Number(level);
  if (!Number.isInteger(value) || value < 1 || value > 4) return null;
  return "₹".repeat(value);
}

export default function LeadCard({ rank, lead, profile, productSummary }) {
  const breakdown = lead.score_breakdown || {};
  const adjustments = lead.adjustments || [];
  const snippets = (lead.research_notes || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
  const price = priceLabel(lead.price_level ?? null);
  const subtitle = [
    lead.business_type,
    lead.address,
  ]
    .filter(Boolean)
    .join(" · ");
  const ratingLine = [
    lead.rating != null ? `★ ${lead.rating}` : null,
    lead.user_ratings_total != null ? `(${lead.user_ratings_total} reviews)` : null,
    price ? `Price: ${price}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ScoreBadge score={lead.match_score} label="Lead score" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            #{rank} · Lead score {lead.match_score}
          </p>
          <h3 className="break-words text-lg font-semibold text-slate-900">{lead.name}</h3>
        </div>
      </div>
      {subtitle && <p className="mt-1 break-words text-sm text-slate-600">{subtitle}</p>}
      {ratingLine && <p className="mt-1 text-sm text-slate-600">{ratingLine}</p>}
      {lead.why_fit && <p className="mt-2 break-words text-sm text-slate-700">{lead.why_fit}</p>}
      {(lead.match_reasons || []).length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {lead.match_reasons.map((line, i) => (
            <li key={i} className="break-words">{line}</li>
          ))}
        </ul>
      )}
      {snippets.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            From public reviews
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {snippets.map((line, i) => (
              <li key={i} className="break-words">{line}</li>
            ))}
          </ul>
        </div>
      )}
      {lead.likely_has_software && (
        <p className="mt-2 inline-block rounded-full border border-amber-600 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
          May already use billing software
        </p>
      )}
      <details className="mt-3 rounded-md bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-700">
          How this score was built
        </summary>
        <dl className="mt-2 grid grid-cols-2 gap-1 text-sm text-slate-700">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="break-words">{key.replace(/_/g, " ")}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
        {adjustments.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {adjustments.map((line, i) => (
              <li key={i} className="break-words">{line}</li>
            ))}
          </ul>
        )}
      </details>
      <div className="mt-2 space-y-1 text-sm">
        {lead.phone && <p className="text-slate-700">Phone: {lead.phone}</p>}
        {lead.maps_url && (
          <p>
            <a
              href={lead.maps_url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-green-800 underline focus:outline-none focus:ring-2 focus:ring-green-700"
            >
              View on Google Maps
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </p>
        )}
      </div>
      <OutreachButton
        profile={profile}
        place={{ ...lead, type: lead.business_type }}
        productSummary={productSummary}
      />
    </article>
  );
}
