import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { Lead, Opportunity } from '../../api/schemas';
import type { JobResult } from '../../api/schemas';
import { LeadCard } from '../customers/LeadCard';
import { JobCard } from '../search/JobCard';
import { OpportunityCard } from '../search/OpportunityCard';
import { StarButton, ShortlistProvider, useShortlist } from './shortlist';

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
      <ShortlistProvider>{children}</ShortlistProvider>
    </QueryClientProvider>
  );
}

function Count() {
  return <p data-testid="count">{useShortlist().count}</p>;
}

const DRAFT = {
  id: 'lead:Sharma Tailoring',
  kind: 'lead' as const,
  title: 'Sharma Tailoring',
  subtitle: 'Tailor · MG Road',
  phone: '919822012345',
};

describe('shortlist context', () => {
  it('toggles items, edits notes and clears', async () => {
    const user = userEvent.setup();
    function Harness() {
      const shortlist = useShortlist();
      return (
        <div>
          <Count />
          <button type="button" onClick={() => shortlist.toggle(DRAFT)}>
            toggle
          </button>
          <button type="button" onClick={() => shortlist.setNote(DRAFT.id, 'call Tuesday')}>
            note
          </button>
          <button type="button" onClick={() => shortlist.clear()}>
            clear
          </button>
          <p data-testid="note">{shortlist.items[0]?.note ?? 'none'}</p>
        </div>
      );
    }
    render(
      <Providers>
        <Harness />
      </Providers>,
    );
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('note')).toBeEmptyDOMElement();
    await user.click(screen.getByRole('button', { name: 'note' }));
    expect(screen.getByTestId('note')).toHaveTextContent('call Tuesday');
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    await user.click(screen.getByRole('button', { name: 'clear' }));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});

describe('StarButton', () => {
  it('toggles pressed state with add/remove labels', async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <Count />
        <StarButton item={DRAFT} />
      </Providers>,
    );
    const add = screen.getByRole('button', { name: 'Add Sharma Tailoring to shortlist' });
    expect(add).toHaveAttribute('aria-pressed', 'false');
    await user.click(add);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    const remove = screen.getByRole('button', { name: 'Remove Sharma Tailoring from shortlist' });
    expect(remove).toHaveAttribute('aria-pressed', 'true');
    await user.click(remove);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('renders nothing without a provider', () => {
    const { container } = render(<StarButton item={DRAFT} />);
    expect(container).toBeEmptyDOMElement();
  });
});

const LEAD: Lead = {
  name: 'Shankar Restaurant',
  address: '12 MG Road, Ahmedabad',
  rating: 4.2,
  user_ratings_total: 320,
  business_type: 'Restaurant',
  match_score: 82,
  match_reasons: ['2 reviews mention possible pain points'],
  research_notes: 'bill was wrong',
  why_fit: 'Mid-size restaurant.',
  pitch_angle: null,
  suggested_first_question: null,
  phone: '919822012345',
  maps_url: null,
  price_level: null,
  score_breakdown: {},
  likely_has_software: false,
  adjustments: [],
};

describe('card star buttons', () => {
  it('stars a lead from its card', async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <Count />
        <LeadCard
          rank={1}
          lead={LEAD}
          offerText="Billing software for restaurants and staff"
          city="Ahmedabad"
          productSummary="Billing software"
          highlighted={false}
          onSelect={() => {}}
        />
      </Providers>,
    );
    await user.click(screen.getByRole('button', { name: 'Add Shankar Restaurant to shortlist' }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('stars a job from its card', async () => {
    const user = userEvent.setup();
    const job: JobResult = {
      title: 'Tailor needed',
      company: 'ABC Tailors',
      location: 'Pune',
      desc: 'Work',
      flags: [],
      risk: 'Low',
    };
    render(
      <Providers>
        <Count />
        <JobCard job={job} highlighted={false} onSelect={() => {}} />
      </Providers>,
    );
    await user.click(screen.getByRole('button', { name: 'Add Tailor needed to shortlist' }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('stars an opportunity from its card', async () => {
    const user = userEvent.setup();
    const opportunity: Opportunity = {
      title: 'Tailoring from home',
      type: 'local business',
      why: 'Fits stitching skills.',
      income_estimate: '₹8,000/month',
      demand: 70,
      competition: 40,
      fit: 90,
      cost_ease: 85,
      trust: 75,
      evidence: ['Local demand noted', 'Steady rates'],
      plan_7_days: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      earn_score: 78,
      score_breakdown: {},
      adjustments: [],
    };
    render(
      <Providers>
        <Count />
        <OpportunityCard
          rank={1}
          opportunity={opportunity}
          compareChecked={false}
          compareDisabled={false}
          onCompareChange={() => {}}
        />
      </Providers>,
    );
    await user.click(
      screen.getByRole('button', { name: 'Add Tailoring from home to shortlist' }),
    );
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});
