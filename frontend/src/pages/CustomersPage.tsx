import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import type { ApiError } from '../api/errors';
import { useLeadsSession } from '../features/customers/session';
import { LeadsProgress, LeadsResultsSkeleton } from '../features/customers/LeadsProgress';
import { LeadsResults } from '../features/customers/LeadsResults';
import { OfferForm } from '../features/customers/OfferForm';

function LeadsError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-4">
      <p className="text-sm text-ink">{error.message}</p>
      {error.requestId ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          Support code: <code className="rounded bg-surface px-1 py-0.5">{error.requestId}</code>
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

/** Customer-mode page: offer form, staged progress, error, results. */
export function CustomersPage() {
  const session = useLeadsSession();
  const loading = session.status === 'loading';

  function editAndRerun() {
    const field = document.getElementById('offer-text');
    if (!field) return;
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    field.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    field.focus({ preventScroll: true });
  }

  return (
    <section aria-labelledby="customers-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="customers-heading" className="text-2xl font-bold text-ink">
          Find customers for my product
        </h1>
        <p className="mt-1 text-sm text-muted">
          Local businesses that could become your customers, ranked as signals.
        </p>
      </div>
      <OfferForm loading={loading} onSubmit={session.run} />
      {loading ? (
        <>
          <LeadsProgress retrying={session.retrying} />
          <LeadsResultsSkeleton />
        </>
      ) : null}
      {session.status === 'error' && session.error ? (
        <LeadsError error={session.error} onRetry={session.retry} />
      ) : null}
      {session.status === 'success' && session.result ? (
        <LeadsResults onEdit={editAndRerun} />
      ) : null}
    </section>
  );
}
