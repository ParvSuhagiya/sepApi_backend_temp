import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Providers } from './providers';
import { ScrollToTop } from './ScrollToTop';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { OfflineBanner } from '../components/OfflineBanner';
import { ErrorBoundary } from '../components/ErrorBoundary';
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
const HowItWorksPage = lazy(() =>
  import('../pages/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })),
);
const PrivacyPage = lazy(() =>
  import('../pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import('../pages/TermsPage').then((m) => ({ default: m.TermsPage })),
);
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
  return (
    <Providers>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-md focus:bg-raised focus:px-4 focus:py-2 focus:font-semibold focus:text-ink"
      >
        Skip to content
      </a>
      <Header />
      <OfflineBanner />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <ErrorBoundary>
          <Suspense fallback={<Spinner label="Loading page" />}>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/app/income" element={<HomePage />} />
              <Route path="/app/customers" element={<CustomersPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/responsible-use" element={<ResponsibleUsePage />} />
              {DevUiRoute ? <Route path="/dev/ui" element={<DevUiRoute />} /> : null}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </Providers>
  );
}
