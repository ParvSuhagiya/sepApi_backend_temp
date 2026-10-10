import { Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Providers } from './providers';
import { ScrollToTop } from './ScrollToTop';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { OfflineBanner } from '../components/OfflineBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PageTransition } from '../components/motion';
import { Spinner } from '../components/ui/Spinner';

// Route-level splitting: page chunks load on demand. Heavy libraries
// (Leaflet, Recharts) arrive the same way with their components.
const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
const LandingPage = lazy(() =>
  import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const CustomersPage = lazy(() =>
  import('../pages/CustomersPage').then((m) => ({ default: m.CustomersPage })),
);
const ShortlistPage = lazy(() =>
  import('../pages/ShortlistPage').then((m) => ({ default: m.ShortlistPage })),
);
const OverviewPage = lazy(() =>
  import('../pages/OverviewPage').then((m) => ({ default: m.OverviewPage })),
);
const HowItWorksPage = lazy(() =>
  import('../pages/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })),
);
const PrivacyPage = lazy(() =>
  import('../pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() => import('../pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const ResponsibleUsePage = lazy(() =>
  import('../pages/ResponsibleUsePage').then((m) => ({ default: m.ResponsibleUsePage })),
);
const NotFoundPage = lazy(() =>
  import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

// DEV-ONLY: the lazy() call sits inside the statically-false branch in
// production builds, so bundlers drop the dynamic import (and its chunk)
// entirely. Verified by asserting dist contains no kitchen-sink strings.
const DevUiRoute =
  import.meta.env.DEV === true
    ? lazy(() =>
        import('../pages/UiKitchenSinkPage').then((module) => ({
          default: module.UiKitchenSinkPage,
        })),
      )
    : null;

/** App shell: skip link, header, main landmark, footer, error boundary. */
export function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <Providers>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-xl focus:bg-raised focus:px-4 focus:py-2 focus:font-semibold focus:text-ink focus:shadow-lg"
      >
        Skip to content
      </a>
      <Header />
      <OfflineBanner />
      <main
        id="main-content"
        tabIndex={-1}
        className="w-full flex-1 py-6 sm:py-8"
      >
        <ErrorBoundary>
          <Suspense fallback={<Spinner label="Loading page" />}>
            <ScrollToTop />
            <PageTransition key={pathname}>
              <Routes location={pathname}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/app/income" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><HomePage /></div>} />
                <Route path="/app/customers" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><CustomersPage /></div>} />
                <Route path="/customers" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><CustomersPage /></div>} />
                <Route path="/app/shortlist" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><ShortlistPage /></div>} />
                <Route path="/app/overview" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><OverviewPage /></div>} />
                <Route path="/how-it-works" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><HowItWorksPage /></div>} />
                <Route path="/privacy" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><PrivacyPage /></div>} />
                <Route path="/terms" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><TermsPage /></div>} />
                <Route path="/responsible-use" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><ResponsibleUsePage /></div>} />
                {DevUiRoute ? <Route path="/dev/ui" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><DevUiRoute /></div>} /> : null}
                <Route path="*" element={<div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><NotFoundPage /></div>} />
              </Routes>
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </Providers>
  );
}
