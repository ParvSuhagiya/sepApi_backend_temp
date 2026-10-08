export default function EfficiencyStrip({ creditsUsed, cacheHits }) {
  return (
    <p className="mt-2 text-xs text-slate-500">
      SerpAPI credits used: {creditsUsed} · Served from cache: {cacheHits}
    </p>
  );
}
