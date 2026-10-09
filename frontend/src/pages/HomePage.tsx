import { motion } from 'framer-motion';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import { Reveal } from '../components/motion';
import { Seo } from '../components/Seo';
import type { ApiError } from '../api/errors';
import { Inspector } from '../features/search/Inspector';
import { ProfileForm } from '../features/search/ProfileForm';
import { SearchProgress, SearchResultsSkeleton } from '../features/search/SearchProgress';
import { SearchResults } from '../features/search/SearchResults';
import { useSearchSession } from '../features/search/session';

function SearchError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-3xl border border-tone-red-border/30 bg-tone-red-bg/10 p-5 shadow-md">
      <p className="text-sm font-semibold text-ink">{error.message}</p>
      {error.requestId ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          Support code: <code className="rounded-lg bg-surface px-2 py-1 font-mono">{error.requestId}</code>
          <CopyButton text={error.requestId} label="support code" />
        </p>
      ) : null}
      <div>
        <Button variant="secondary" onClick={onRetry}>
          Retry search
        </Button>
      </div>
    </div>
  );
}

/** Income-mode landing page: form, staged progress, error, results. */
export function HomePage() {
  const session = useSearchSession();
  const loading = session.status === 'loading';

  return (
    <section aria-labelledby="income-heading" className="flex flex-col gap-6">
      <Seo route="/app/income" />
      {/* Stitch Command Strip */}
      <Reveal>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-line/80 bg-raised/90 p-4 sm:p-5 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl brand-gradient text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 id="income-heading" className="font-display text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
                Income Discovery Radar
              </h1>
              <span className="rounded-full bg-brand/10 border border-brand/20 px-2 py-0.5 text-[10px] font-bold text-brand uppercase tracking-wider">
                Live
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              Skills and city in, ranked income ideas out — with scam signals and 7-day plans.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-ink">
          <div className="flex items-center gap-1.5 rounded-xl border border-line/80 bg-surface/80 px-3 py-1.5 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-muted">Active Engine:</span>
            <span className="font-bold text-brand">Real-Time Blend</span>
          </div>
        </div>
      </div>
      </Reveal>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-8">
          <div className="rounded-2xl border border-line/80 bg-raised/90 p-4 shadow-sm backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-line/60 pb-3">
              <p className="flex items-center gap-2 text-base font-bold text-ink">
                <SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-brand" />
                Radar Search Parameters
              </p>
              <p className="hidden text-xs text-muted sm:block">SerpAPI Realtime Engine</p>
            </div>
            <ProfileForm loading={loading} onSubmit={session.run} />
          </div>
          {loading ? (
            <>
              <SearchProgress retrying={session.retrying} />
              <SearchResultsSkeleton />
            </>
          ) : null}
          {session.status === 'error' && session.error ? (
            <SearchError error={session.error} onRetry={session.retry} />
          ) : null}
          {session.status === 'success' && session.result ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <SearchResults />
            </motion.div>
          ) : null}
        </div>
        <div className="min-w-0 xl:col-span-4">
          <Inspector result={session.result} />
        </div>
      </div>
    </section>
  );
}
