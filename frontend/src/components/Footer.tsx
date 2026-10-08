import { useHealth } from '../api/hooks';

/** Site footer: honesty disclaimers, API status, version. Never blocks. */
export function Footer() {
  const { data, isError, isPending } = useHealth();
  const status = isPending ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-muted" />
      Checking API…
    </span>
  ) : isError || !data?.ok ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-tone-red-bg" />
      API unreachable
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-tone-green-bg" />
      API online
    </span>
  );

  return (
    <footer className="border-t border-line bg-raised">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-6 text-xs text-muted">
        <p>
          Income figures are estimates, never promises. EarnScore blends 30% Demand, 20% Fit,
          20% Trust, 15% Low competition and 15% Easy to start; Demand, Competition and Trust
          are estimated from collected evidence.
        </p>
        <p>
          Scam Shield is a text-pattern signal, not a safety verdict — a “low risk” badge
          cannot guarantee a job is safe.
        </p>
        <p>
          EarnRadar provides information, not guarantees. Always verify an employer before
          sharing personal details or money. Nothing is ever sent automatically: you review,
          edit, then open WhatsApp yourself.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {status}
          {data?.version ? <span>Backend v{data.version}</span> : null}
          <span>Frontend v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
