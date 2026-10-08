import { Link } from 'react-router-dom';

/** Unknown routes. */
export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading" className="flex flex-col items-start gap-2">
      <h1 id="not-found-heading" className="text-2xl font-bold text-ink">
        Page not found
      </h1>
      <p className="text-sm text-muted">The page you asked for does not exist.</p>
      <Link to="/" className="font-semibold text-brand underline">
        Back to EarnRadar home
      </Link>
    </section>
  );
}
