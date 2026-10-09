/** Honest explainer page: what the app does and does not promise. */
import { Seo } from '../components/Seo';

export function HowItWorksPage() {
  return (
    <section aria-labelledby="how-it-works-heading" className="flex flex-col gap-6">
      <Seo route="/how-it-works" />
      <div>
        <h1 id="how-it-works-heading" className="text-2xl font-bold text-ink">
          How EarnRadar works
        </h1>
        <p className="mt-1 text-sm text-muted">
          Plain words. Short version: live evidence in, honest scores out.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-ink">Where the data comes from</h2>
        <p className="text-sm text-ink">
          <strong>Find income ideas</strong> searches live jobs, local businesses on the map,
          demand trends and forum discussions near your city — for example Pune or Ahmedabad.
          <strong> Find customers</strong> searches businesses on the map and reads their public
          reviews for pain signals, plus one competitor search.
        </p>
        <p className="text-sm text-ink">
          A search takes 10–40 seconds. It takes longer after idle while the server wakes up.
          Business websites are never fetched. Nothing is ever sent automatically.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-ink">How EarnScore is computed</h2>
        <p className="text-sm text-ink">
          EarnScore blends five signals: 30% Demand, 20% Fit, 20% Trust, 15% Low competition
          and 15% Easy to start. Lead scores blend 40% mid-level fit, 30% pain signals, 15%
          reachability and 15% no-software signal.
        </p>
        <p className="text-sm text-ink">
          Guardrails only lower scores, and every adjustment is listed under “How this score
          was built”. Income figures are always estimates, never promises.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-ink">Scam Shield: what it checks</h2>
        <p className="text-sm text-ink">
          Every job is scanned for text patterns such as upfront-fee demands, vague pay and
          personal-data requests. Matches become readable flags with a Low, Medium or High
          risk badge.
        </p>
        <p className="text-sm text-ink">
          Its limits matter more: it reads text, not intent. A “low risk” badge cannot
          guarantee a job is safe. High-risk listings stay visible with a caution panel —
          verify every employer before paying money or sharing documents.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-ink">Caching and credits</h2>
        <p className="text-sm text-ink">
          Searches hit a cache first. A repeated identical search costs zero credits and
          reports it. Every results page shows “credits used” and “served from cache” so you
          can see exactly what a search cost.
        </p>
        <p className="text-sm text-ink">
          Limits protect everyone: searches are rate-limited per IP address, request bodies
          are capped at 20&nbsp;KB, and failures show a support code — never raw server text.
        </p>
      </div>
    </section>
  );
}
