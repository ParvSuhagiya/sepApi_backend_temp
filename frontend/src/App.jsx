import { Suspense, lazy, useRef, useState } from "react";
import { ApiError, leads, search } from "./api.js";
import EfficiencyStrip from "./components/EfficiencyStrip.jsx";
import ErrorMessage from "./components/ErrorMessage.jsx";
import Footer from "./components/Footer.jsx";
import ForumCard from "./components/ForumCard.jsx";
import JobCard, { JobListDisclaimer } from "./components/JobCard.jsx";
import LeadCard from "./components/LeadCard.jsx";
import LocalCard from "./components/LocalCard.jsx";
import MarketNotes from "./components/MarketNotes.jsx";
import ModeSwitch from "./components/ModeSwitch.jsx";
import OfferForm from "./components/OfferForm.jsx";
import OpportunityCard from "./components/OpportunityCard.jsx";
import ProfileForm from "./components/ProfileForm.jsx";
import ProgressLine from "./components/ProgressLine.jsx";

const LEADS_PROGRESS = [
  "Understanding your offer",
  "Finding restaurants",
  "Reading public reviews",
  "Ranking leads",
];

const TrendChart = lazy(() => import("./components/TrendChart.jsx"));

export default function App() {
  const [mode, setMode] = useState("income");
  const [status, setStatus] = useState("idle");
  const [profile, setProfile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(true);
  const [offerInput, setOfferInput] = useState(null);
  const [leadsResult, setLeadsResult] = useState(null);
  const [leadsStatus, setLeadsStatus] = useState("idle");
  const [leadsError, setLeadsError] = useState("");
  const [leadsNotice, setLeadsNotice] = useState(true);
  const resultsRef = useRef(null);

  async function runSearch(nextProfile) {
    const current = nextProfile || profile;
    if (!current) return;
    setProfile(current);
    setStatus("loading");
    setError("");
    setNotice(true);
    try {
      const data = await search(current);
      setResult(data);
      setStatus("success");
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  const degraded = result?.meta?.degraded || [];
  const partial = result?.meta?.partial || [];
  const showNotice = degraded.length > 0 || partial.length > 0;

  async function runLeads(nextInput) {
    const current = nextInput || offerInput;
    if (!current) return;
    setOfferInput(current);
    setLeadsStatus("loading");
    setLeadsError("");
    setLeadsNotice(true);
    try {
      const data = await leads(current);
      setLeadsResult(data);
      setLeadsStatus("success");
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setLeadsError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setLeadsStatus("error");
    }
  }

  const leadsMeta = leadsResult?.meta || {};
  const leadsNotes = leadsMeta.notes || [];
  const showLeadsNotice =
    (leadsMeta.degraded || []).length > 0 ||
    (leadsMeta.partial || []).length > 0 ||
    leadsNotes.includes("deadline_reached") ||
    leadsNotes.includes("ai_text_fallback");
  const outreachProfile = offerInput
    ? { skills: offerInput.offer.slice(0, 300), city: offerInput.city }
    : null;
  const productSummary = (leadsResult?.offer_summary || "").slice(0, 200);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">EarnRadar</h1>
        <p className="mt-1 text-sm text-slate-600">
          {mode === "income"
            ? "Realistic income ideas for your skills, city, hours and budget."
            : "Find local businesses that could become your customers."}
        </p>
      </header>

      <div className="mt-4">
        <ModeSwitch mode={mode} onChange={setMode} />
      </div>

      <main>
        {mode === "income" && (
          <section aria-label="Search" className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <ProfileForm loading={status === "loading"} onSubmit={runSearch} />
            {status === "loading" && <ProgressLine />}
          </section>
        )}

        {mode === "customers" && (
          <section aria-label="Find customers" className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <OfferForm loading={leadsStatus === "loading"} onSubmit={runLeads} />
            {leadsStatus === "loading" && <ProgressLine messages={LEADS_PROGRESS} />}
          </section>
        )}

        {mode === "income" && status === "error" && (
          <ErrorMessage message={error} onRetry={() => runSearch()} />
        )}

        {mode === "customers" && leadsStatus === "error" && (
          <ErrorMessage message={leadsError} onRetry={() => runLeads()} />
        )}

        {mode === "customers" && leadsStatus === "success" && leadsResult && (
          <div ref={resultsRef} className="mt-6 space-y-6">
            {showLeadsNotice && leadsNotice && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p>
                  Some data was partial, so these leads may be thinner than
                  usual. Scores are signals, not guarantees.
                </p>
                <button
                  type="button"
                  onClick={() => setLeadsNotice(false)}
                  className="mt-1 min-h-[40px] text-sm font-semibold underline focus:outline-none focus:ring-2 focus:ring-amber-700"
                >
                  Dismiss
                </button>
              </div>
            )}

            <section aria-label="Customer leads">
              <h2 className="text-lg font-semibold text-slate-900">Businesses to approach</h2>
              <p className="mt-1 text-sm text-slate-600">{leadsResult.disclaimer}</p>
              {(leadsResult.leads || []).length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  No matching restaurants found. Try a nearby larger city or a broader description.
                </p>
              ) : (
                <div className="mt-3 space-y-4">
                  {leadsResult.leads.map((lead, i) => (
                    <LeadCard
                      key={`${lead.name}-${i}`}
                      rank={i + 1}
                      lead={lead}
                      profile={outreachProfile}
                      productSummary={productSummary}
                    />
                  ))}
                </div>
              )}
            </section>

            <MarketNotes notes={leadsResult.market_notes} />
          </div>
        )}

        {mode === "income" && status === "success" && result && (
          <div ref={resultsRef} className="mt-6 space-y-6">
            {showNotice && notice && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p>
                  Some data sources were unavailable, so results may be thinner than
                  usual.
                </p>
                <button
                  type="button"
                  onClick={() => setNotice(false)}
                  className="mt-1 min-h-[40px] text-sm font-semibold underline focus:outline-none focus:ring-2 focus:ring-amber-700"
                >
                  Dismiss
                </button>
              </div>
            )}

            <section aria-label="Opportunities">
              <h2 className="text-lg font-semibold text-slate-900">Top opportunities for you</h2>
              <EfficiencyStrip
                creditsUsed={result.stats?.credits_used ?? 0}
                cacheHits={result.stats?.cache_hits ?? 0}
              />
              <div className="mt-3 space-y-4">
                {result.opportunities.map((opp, i) => (
                  <OpportunityCard key={`${opp.title}-${i}`} rank={i + 1} opportunity={opp} />
                ))}
              </div>
            </section>

            <section aria-label="Jobs">
              <h2 className="text-lg font-semibold text-slate-900">Live jobs</h2>
              <div className="mt-2">
                <JobListDisclaimer />
              </div>
              {result.jobs.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  No live jobs found for this search. Try a broader skill or a larger
                  nearby city.
                </p>
              ) : (
                <div className="mt-3 space-y-4">
                  {result.jobs.map((job, i) => (
                    <JobCard key={`${job.title}-${job.company}-${i}`} job={job} />
                  ))}
                </div>
              )}
            </section>

            {result.local.length > 0 && (
              <section aria-label="Nearby businesses">
                <h2 className="text-lg font-semibold text-slate-900">Nearby businesses</h2>
                <div className="mt-3 space-y-4">
                  {result.local.map((place, i) => (
                    <LocalCard
                      key={`${place.name}-${i}`}
                      profile={profile}
                      place={place}
                    />
                  ))}
                </div>
              </section>
            )}

            <Suspense fallback={<p className="text-sm text-slate-500">Loading chart…</p>}>
              <TrendChart
                keyword={result.trend_keyword}
                growth={result.trend_growth?.[result.trend_keyword]}
                points={result.trend}
                allGrowth={result.trend_growth}
              />
            </Suspense>

            {result.forum.length > 0 && (
              <section aria-label="Forum discussions">
                <h2 className="text-lg font-semibold text-slate-900">What people discuss</h2>
                <div className="mt-3 space-y-4">
                  {result.forum.map((item, i) => (
                    <ForumCard key={`${item.link}-${i}`} item={item} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
