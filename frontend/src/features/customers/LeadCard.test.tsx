import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ENV } from '../../env';
import type { Lead } from '../../api/schemas';
import { jsonError, jsonOk } from '../../test/fixtures';
import '../../test/msw';
import { server } from '../../test/msw';
import { LeadCard } from './LeadCard';
import { LEAD_OPT_OUT_LINE } from './leadUtils';

const api = (path: string) => `${ENV.apiUrl}${path}`;

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
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    name: 'Shankar Restaurant',
    address: '12 MG Road, Ahmedabad',
    rating: 4.2,
    user_ratings_total: 320,
    business_type: 'Restaurant',
    match_score: 82,
    match_reasons: ['2 reviews mention possible pain points'],
    research_notes: 'bill was wrong; waited a long time',
    why_fit: 'Mid-size restaurant with billing pain showing in reviews.',
    pitch_angle: 'Cut billing errors and save staff time.',
    suggested_first_question: 'How do you handle billing errors today?',
    phone: '919822012345',
    maps_url: 'https://maps.google.com/?q=shankar',
    price_level: 2,
    score_breakdown: { mid_level: 80, pain: 66.7, reachability: 66.7, no_software: 100 },
    likely_has_software: false,
    adjustments: [],
    ...overrides,
  };
}

const cardProps = {
  rank: 1,
  offerText: 'Restaurant management software for billing and staff duties',
  city: 'Ahmedabad',
  productSummary: 'Restaurant management system',
  highlighted: false,
  onSelect: () => {},
};

describe('LeadCard', () => {
  it('renders rank, score, name, rating and price level', () => {
    render(
      <Providers>
        <LeadCard {...cardProps} lead={lead()} />
      </Providers>,
    );
    expect(screen.getByRole('heading', { name: 'Shankar Restaurant' })).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText(/rated 4\.2 from 320 reviews/i)).toBeInTheDocument();
    expect(screen.getByText(/price level/i)).toBeInTheDocument();
    expect(screen.getByText('Cut billing errors and save staff time.')).toBeInTheDocument();
  });

  it('labels review snippets as quotes without editing them', () => {
    render(
      <Providers>
        <LeadCard {...cardProps} lead={lead()} />
      </Providers>,
    );
    expect(screen.getByText('From public reviews')).toBeInTheDocument();
    expect(screen.getByText(/bill was wrong/)).toBeInTheDocument();
    expect(screen.getByText(/waited a long time/)).toBeInTheDocument();
    expect(document.querySelectorAll('blockquote')).toHaveLength(2);
  });

  it('shows the software chip and the partial-research badge', () => {
    const { rerender } = render(
      <Providers>
        <LeadCard {...cardProps} lead={lead({ likely_has_software: true })} />
      </Providers>,
    );
    expect(screen.getByText('May already use billing software')).toBeInTheDocument();
    expect(screen.queryByText('Research partial')).not.toBeInTheDocument();
    rerender(
      <Providers>
        <LeadCard {...cardProps} lead={lead({ research: 'partial' })} />
      </Providers>,
    );
    expect(screen.getByText('Research partial')).toBeInTheDocument();
  });

  it('shows weighted breakdown bars, the formula and adjustments', () => {
    render(
      <Providers>
        <LeadCard
          {...cardProps}
          lead={lead({ adjustments: ['Hard to reach: no public phone or website'] })}
        />
      </Providers>,
    );
    expect(screen.getByRole('img', { name: 'Mid-level fit: 80.0 of 100' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Pain signals: 66.7 of 100' })).toBeInTheDocument();
    expect(screen.getByText(/final formula/i)).toBeInTheDocument();
    expect(screen.getByText(/hard to reach/i)).toBeInTheDocument();
  });

  it('links phone, website and maps contacts', () => {
    render(
      <Providers>
        <LeadCard {...cardProps} lead={lead({ website: 'https://shankar.example/menu' })} />
      </Providers>,
    );
    expect(screen.getByRole('link', { name: '919822012345' })).toHaveAttribute(
      'href',
      'tel:919822012345',
    );
    const site = screen.getByRole('link', { name: /business website/i });
    expect(site).toHaveAttribute('href', 'https://shankar.example/menu');
    expect(site).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /view on google maps/i })).toHaveAttribute(
      'target',
      '_blank',
    );
  });

  it('copies the pitch and the first question', () => {
    render(
      <Providers>
        <LeadCard {...cardProps} lead={lead()} />
      </Providers>,
    );
    expect(screen.getByRole('button', { name: /copy pitch angle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy first question/i })).toBeInTheDocument();
  });
});

describe('LeadCard outreach flow', () => {
  const draftMessage = `I offer billing software for local restaurants. ${LEAD_OPT_OUT_LINE}`;

  it('drafts with product summary, keeps the opt-out, never sends the phone', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    let sent: unknown = null;
    server.use(
      http.post(api('/api/outreach'), async ({ request }) => {
        sent = await request.json();
        return jsonOk({
          message: draftMessage,
          safety_note: 'Verify the business before paying or sharing documents.',
        });
      }),
    );
    render(
      <Providers>
        <LeadCard {...cardProps} lead={lead()} />
      </Providers>,
    );
    await user.click(screen.getByRole('button', { name: /draft whatsapp message/i }));
    const box = (await screen.findByLabelText(/edit before sending/i)) as HTMLTextAreaElement;
    expect(box.value).toBe(draftMessage);
    expect(box.value).toContain(LEAD_OPT_OUT_LINE);
    expect(screen.getByText(/verify the business/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /review, then open in whatsapp/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('https://wa.me/919822012345'));
    expect(open).not.toHaveBeenCalled();
    expect(sent).toEqual({
      profile: {
        skills: 'Restaurant management software for billing and staff duties',
        city: 'Ahmedabad',
        hours: 10,
        budget: 0,
      },
      target: {
        name: 'Shankar Restaurant',
        type: 'Restaurant',
        address: '12 MG Road, Ahmedabad',
        rating: 4.2,
        product_summary: 'Restaurant management system',
      },
    });
    open.mockRestore();
  });

  it('hides the outreach flow without a phone and errors with retry', async () => {
    const user = userEvent.setup();
    server.use(http.post(api('/api/outreach'), () => jsonError('upstream_failure', 'down', 502)));
    const { rerender } = render(
      <Providers>
        <LeadCard {...cardProps} lead={lead({ phone: null })} />
      </Providers>,
    );
    expect(
      screen.queryByRole('button', { name: /draft whatsapp message/i }),
    ).not.toBeInTheDocument();
    rerender(
      <Providers>
        <LeadCard {...cardProps} lead={lead()} />
      </Providers>,
    );
    await user.click(screen.getByRole('button', { name: /draft whatsapp message/i }));
    expect(await screen.findByText('Could not draft message.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^retry$/i })).toBeInTheDocument();
  });
});
