import { Route, Routes } from 'react-router-dom';
import { Providers } from './providers';
import { CustomersPage } from '../pages/CustomersPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UiKitchenSinkPage } from '../pages/UiKitchenSinkPage';

/** Route table. Heavy pages (map, charts) become lazy() in step 1.4. */
export function AppRoutes() {
  return (
    <Providers>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/dev/ui" element={<UiKitchenSinkPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Providers>
  );
}
