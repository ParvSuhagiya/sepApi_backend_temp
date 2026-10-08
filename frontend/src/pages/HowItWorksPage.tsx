/** Honest explainer page: what the app does and does not promise. */
export function HowItWorksPage() {
  return (
    <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-4">
      <h1 id="how-it-works-heading" className="text-2xl font-bold text-ink">
        How EarnRadar works
      </h1>
      <div className="flex flex-col gap-3 text-sm text-ink">
        <p>
          <strong>Find income ideas</strong> turns your skills, city, weekly hours and budget
          into ranked opportunities. We search live jobs, local businesses, demand trends and
          forums, then blend the evidence into an EarnScore: 30% Demand, 20% Fit, 20% Trust,
          15% Low competition, 15% Easy to start.
        </p>
        <p>
          <strong>Find customers</strong> turns your product description into ranked local
          businesses that could buy from you, with review-derived pain signals and a draft
          first message you review yourself.
        </p>
        <p>
          A search takes 10–40 seconds (longer after idle while the server wakes up). Results
          can be partial when a data source fails, and a repeated search costs nothing
          because it is served from cache.
        </p>
        <p>
          Limits that protect everyone: searches are rate-limited per IP address, request
          bodies are capped at 20&nbsp;KB, and every failure shows a support code you can
          share when asking for help — never raw server text.
        </p>
      </div>
    </section>
  );
}
