import { Link } from 'react-router-dom';
import { Radar } from 'lucide-react';
import { useHealth } from '../api/hooks';

/** Institutional footer: brand, live status, route columns, honesty line. */
export function Footer() {
  const { data, isError, isPending } = useHealth();
  const status = isPending ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-muted" />
      Checking API…
    </span>
  ) : isError || !data?.ok ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-tone-red-border bg-tone-red-bg px-2.5 py-1 text-xs font-medium text-tone-red-fg">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-white" />
      API unreachable
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-tone-green-border/40 bg-tone-green-bg/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <span aria-hidden="true" className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      API online
    </span>
  );

  return (
    <footer className="mt-12 border-t border-line bg-raised">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col items-start gap-3">
          <span className="flex items-center gap-2 text-base font-bold text-ink">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-strong text-white">
              <Radar aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="font-display tracking-tight">
              Earn<span className="text-brand">Radar</span>
            </span>
          </span>
          <p className="max-w-xs text-muted">
            Realistic income ideas and customer leads for India. Estimates, never promises.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {status}
            {data?.version ? <span className="text-xs text-muted">Backend v{data.version}</span> : null}
          </div>
        </div>
        <nav aria-label="Telemetry and nodes" className="flex flex-col items-start gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-ink">Telemetry & Nodes</p>
          <Link to="/app/income" className="text-muted hover:text-ink">
            Income Discovery
          </Link>
          <Link to="/app/customers" className="text-muted hover:text-ink">
            B2B Leads Radar
          </Link>
          <Link to="/app/shortlist" className="text-muted hover:text-ink">
            Saved Shortlist
          </Link>
        </nav>
        <nav aria-label="Intelligence platform" className="flex flex-col items-start gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-ink">Intelligence Platform</p>
          <Link to="/how-it-works" className="text-muted hover:text-ink">
            How it works
          </Link>
          <Link to="/responsible-use" className="text-muted hover:text-ink">
            Responsible use
          </Link>
          <Link to="/privacy" className="text-muted hover:text-ink">
            Privacy
          </Link>
          <Link to="/terms" className="text-muted hover:text-ink">
            Terms
          </Link>
        </nav>
        <div className="flex flex-col items-start gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-ink">Governance & Trust</p>
          <p className="text-muted">
            Income figures are estimates, never promises. Scam Shield is a text-pattern signal,
            not a safety verdict.
          </p>
          <p className="text-muted">
            EarnRadar provides information, not guarantees. Nothing is ever sent automatically.
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted">
          <p>© 2026 EarnRadar. Estimates, not promises.</p>
          <p>Frontend v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
