import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Providers } from './providers';
import { CustomersPage } from '../pages/CustomersPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';

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

/** Route table. Heavy pages (map, charts) become lazy() in step 1.4. */
export function AppRoutes() {
  return (
    <Providers>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/customers" element={<CustomersPage />} />
        {DevUiRoute ? (
          <Route
            path="/dev/ui"
            element={
              <Suspense fallback={<p>Loading preview…</p>}>
                <DevUiRoute />
              </Suspense>
            }
          />
        ) : null}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Providers>
  );
}
