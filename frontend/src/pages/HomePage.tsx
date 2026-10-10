import { motion } from 'framer-motion';
import { RefreshCw, Shield, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import { Seo } from '../components/Seo';
import type { ApiError } from '../api/errors';
import { Inspector } from '../features/search/Inspector';
import { ProfileForm } from '../features/search/ProfileForm';
import { SearchProgress, SearchResultsSkeleton } from '../features/search/SearchProgress';
import { SearchResults } from '../features/search/SearchResults';
import { useSearchSession } from '../features/search/session';

function SearchError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        padding: '16px 20px',
        borderRadius: 10,
        border: '1px solid rgba(220,38,38,.25)',
        background: 'var(--er-danger-bg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--er-ink)', margin: 0 }}>{error.message}</p>
      {error.requestId && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--er-muted)', margin: 0 }}>
          Code:{' '}
          <code
            style={{
              background: 'var(--er-surface)',
              border: '1px solid var(--er-line)',
              borderRadius: 6,
              padding: '2px 8px',
              fontFamily: 'monospace',
            }}
          >
            {error.requestId}
          </code>
          <CopyButton text={error.requestId} label="support code" />
        </p>
      )}
      <Button variant="secondary" onClick={onRetry}>Retry</Button>
    </div>
  );
}

export function HomePage() {
  const session = useSearchSession();
  const loading = session.status === 'loading';
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1400);
  }

  return (
    <section aria-labelledby="income-heading" className="flex flex-col gap-6">
      <Seo route="/app/income" />

      {/* Page header */}
      <div className="er-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="income-heading" className="er-page-title">
            Income Discovery
          </h1>
          <p className="mt-1 text-sm text-muted">
            Find freelance gigs, local gaps, and remote jobs matched to your skills
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Indore MP-09
          </span>
          <button
            type="button"
            onClick={refresh}
            className="er-btn er-btn-secondary"
            style={{ fontSize: 12, padding: '6px 14px', height: 34 }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_300px]">
        {/* Left column */}
        <div className="flex flex-col gap-5">

          {/* Search form */}
          <div className="er-card">
            <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <SlidersHorizontal size={15} color="var(--er-accent)" />
                Search Parameters
              </p>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <Shield size={11} color="var(--er-success)" />
                Anti-Scam Active
              </span>
            </div>
            <ProfileForm loading={loading} onSubmit={session.run} />
          </div>

          {/* Results area */}
          {loading && (
            <>
              <SearchProgress retrying={session.retrying} />
              <SearchResultsSkeleton />
            </>
          )}

          {session.status === 'error' && session.error && (
            <SearchError error={session.error} onRetry={session.retry} />
          )}

          {session.status === 'success' && session.result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SearchResults />
            </motion.div>
          )}

          {/* Empty state samples */}
          {session.status !== 'success' && session.status !== 'loading' && session.status !== 'error' && (
            <div className="flex flex-col gap-4">
              <p className="er-label">Example Results</p>

              {/* Good lead */}
              <div className="er-card-hover" style={{ borderLeft: '3px solid var(--er-accent)', paddingLeft: 18 }}>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="er-badge er-badge-brand">94% Fit</span>
                  <span className="er-badge er-badge-green">Escrow Verified</span>
                  <span className="er-badge er-badge-neutral">Indore · Local Gap</span>
                </div>
                <p className="mb-1.5 text-[15px] font-bold text-ink">
                  Cloud Kitchen WhatsApp Automation
                </p>
                <p className="mb-3 text-[13px] leading-relaxed text-muted">
                  Food collective losing 22% margin to aggregator apps. Deploy WhatsApp catalog + UPI checkout.
                </p>
                <p className="text-[15px] font-bold text-ink">
                  ₹28,000 – ₹45,000/mo
                  <span className="ml-2 text-[12px] font-normal text-muted">~12 hrs/week</span>
                </p>
              </div>

              {/* Scam blocked */}
              <div className="er-card" style={{ borderColor: 'rgba(220,38,38,.2)', background: 'var(--er-danger-bg)' }}>
                <div className="flex items-center gap-3">
                  <div className="er-icon-wrap er-icon-red" style={{ width: 36, height: 36 }}>
                    <Shield size={16} />
                  </div>
                  <div>
                    <span className="er-badge er-badge-red mb-1 block w-fit">Fraud Blocked</span>
                    <p className="text-[13px] font-bold text-red-600">
                      Captcha Typing Scam — ₹999 upfront deposit demanded
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-muted">
                  Detected: advance payment heuristic #402. Domain blacklisted. You were protected.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-[80px]">
          <Inspector result={session.result} />
        </div>
      </div>
    </section>
  );
}
