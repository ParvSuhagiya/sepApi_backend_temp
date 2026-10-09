import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ToastProvider } from '../components/ui/Toast';
import { SearchSessionProvider } from '../features/search/session';
import { ThemeProvider } from './theme';

/** App-wide providers: theme, toasts, server-state cache, search session. */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Our client retries idempotent POSTs itself; TanStack must not add more.
            retry: false,
            refetchOnWindowFocus: false,
            gcTime: 5 * 60 * 1000,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <SearchSessionProvider>{children}</SearchSessionProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
