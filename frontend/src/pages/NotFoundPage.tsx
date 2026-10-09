import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Radar } from 'lucide-react';
import { Seo } from '../components/Seo';

/** Unknown routes. */
export function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <section
      aria-labelledby="not-found-heading"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <Seo route="*" path={pathname} />
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl brand-gradient text-white shadow-xl shadow-indigo-500/20 mb-6">
        <Radar className="h-10 w-10 animate-spin" style={{ animationDuration: '12s' }} />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-brand">404 Error</span>
      <h1 id="not-found-heading" className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
        Page not found
      </h1>
      <p className="mt-2 text-sm sm:text-base text-muted max-w-md">
        The radar could not locate the page you were looking for. It may have been moved or updated.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="brand-gradient inline-flex min-h-[44px] items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md hover:brightness-110 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to EarnRadar home</span>
        </Link>
      </div>
    </section>
  );
}
