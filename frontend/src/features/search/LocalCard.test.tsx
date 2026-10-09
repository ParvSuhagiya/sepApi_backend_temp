import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ENV } from '../../env';
import { jsonError, jsonOk, outreachSuccess } from '../../test/fixtures';
import '../../test/msw';
import { server } from '../../test/msw';
import { SearchSessionProvider } from './session';
import { LocalCard, LocalList } from './LocalCard';

const api = (path: string) => `${ENV.apiUrl}${path}`;
const PROFILE = { skills: 'tailoring', city: 'Pune', hours: 10, budget: 0 };

function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SearchSessionProvider>{children}</SearchSessionProvider>
    </QueryClientProvider>
  );
}

const PLACE = {
  name: 'Sharma Tailoring',
  type: 'Tailor',
  address: 'MG Road Pune',
  rating: 4.5,
  reviews: 120,
  phone: '+91 98220 12345',
};

describe('LocalCard', () => {
  it('renders rating stars, counts, address and tel link', () => {
    render(
      <Providers>
        <LocalCard place={PLACE} profile={PROFILE} />
      </Providers>,
    );
    expect(screen.getByRole('heading', { name: 'Sharma Tailoring' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /rated 4\.5 out of 5 stars/i })).toBeInTheDocument();
    expect(screen.getByText(/\(120 reviews\)/)).toBeInTheDocument();
    const tel = screen.getByRole('link', { name: '+91 98220 12345' });
    expect(tel).toHaveAttribute('href', 'tel:919822012345');
  });

  it('hides the outreach flow without a phone', () => {
    render(
      <Providers>
        <LocalCard place={{ ...PLACE, phone: null }} profile={PROFILE} />
      </Providers>,
    );
    expect(
      screen.queryByRole('button', { name: /draft whatsapp message/i }),
    ).not.toBeInTheDocument();
  });
});

describe('OutreachButton flow', () => {
  it('drafts into an editable textarea with counter, safety note and link', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    let sent: unknown = null;
    server.use(
      http.post(api('/api/outreach'), async ({ request }) => {
        sent = await request.json();
        return jsonOk(outreachSuccess);
      }),
    );
    render(
      <Providers>
        <LocalCard place={PLACE} profile={PROFILE} />
      </Providers>,
    );
    await user.click(screen.getByRole('button', { name: /draft whatsapp message/i }));
    const box = await screen.findByLabelText(/edit before sending/i);
    expect(box.tagName).toBe('TEXTAREA');
    expect(box).toHaveValue('Hello, I do tailoring work in Pune.');
    expect(screen.getByText(/7\/70 words target/)).toBeInTheDocument();
    expect(screen.getByText(/verify the business/i)).toBeInTheDocument();
    await user.clear(box);
    await user.type(box, 'Edited draft');
    expect(box).toHaveValue('Edited draft');
    const link = screen.getByRole('link', { name: /review, then open in whatsapp/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/919822012345'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(open).not.toHaveBeenCalled();
    expect(sent).toEqual({
      profile: PROFILE,
      target: { name: 'Sharma Tailoring', type: 'Tailor', address: 'MG Road Pune', rating: 4.5 },
    });
    open.mockRestore();
  });

  it('shows an error with retry on failure', async () => {
    const user = userEvent.setup();
    server.use(http.post(api('/api/outreach'), () => jsonError('upstream_failure', 'down', 502)));
    render(
      <Providers>
        <LocalCard place={PLACE} profile={PROFILE} />
      </Providers>,
    );
    await user.click(screen.getByRole('button', { name: /draft whatsapp message/i }));
    expect(await screen.findByText('Could not draft message.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^retry$/i })).toBeInTheDocument();
  });
});

describe('LocalList', () => {
  it('renders an empty note without places', () => {
    render(
      <Providers>
        <LocalList places={[]} />
      </Providers>,
    );
    expect(screen.getByText(/no nearby businesses/i)).toBeInTheDocument();
  });
});
