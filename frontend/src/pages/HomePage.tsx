import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import type { ApiError } from '../api/errors';
import { ProfileForm } from '../features/search/ProfileForm';
import { SearchProgress, SearchResultsSkeleton } from '../features/search/SearchProgress';
import { SearchResults } from '../features/search/SearchResults';
import { useSearchSession } from '../features/search/session';

function SearchError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
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

/** Income-mode landing page: form, staged progress, error, results. */
export function HomePage() {
  const session = useSearchSession();
  const loading = session.status === 'loading';

  return (
    <section aria-labelledby="income-heading" className="flex flex-col gap-6">
      <div>
        <h1 id="income-heading" className="text-2xl font-bold text-ink">
          Find income ideas
        </h1>
        <p className="mt-1 text-sm text-muted">
          Realistic income ideas for your skills, city, hours and budget.
        </p>
      </div>
      <ProfileForm loading={loading} onSubmit={session.run} />
      {loading ? (
        <>
          <SearchProgress retrying={session.retrying} />
          <SearchResultsSkeleton />
        </>
      ) : null}
      {session.status === 'error' && session.error ? (
        <SearchError error={session.error} onRetry={session.retry} />
      ) : null}
      {session.status === 'success' && session.result ? <SearchResults /> : null}
    </section>
  );
}
