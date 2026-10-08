import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/** App-wide providers. Theme provider arrives with the design system (1.2). */
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
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
