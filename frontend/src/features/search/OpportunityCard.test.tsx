import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Opportunity } from '../../api/schemas';
import { OpportunityCard } from './OpportunityCard';

function opp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    title: 'Tailoring from home',
    type: 'local business',
    why: 'Fits stitching skills.',
    income_estimate: '₹8,000/month (estimate)',
    demand: 70,
    competition: 40,
    fit: 90,
    cost_ease: 85,
    trust: 75,
    evidence: ['Local demand noted', 'Forum mentions steady rates'],
    plan_7_days: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    earn_score: 78,
    score_breakdown: { demand: 21.0, fit: 18.0, trust: 15.0, low_competition: 9.0, cost_ease: 12.8 },
    adjustments: ['Trust capped: scam signals in matching jobs.'],
    ...overrides,
  };
}

const cardProps = {
  rank: 1,
  compareChecked: false,
  compareDisabled: false,
  onCompareChange: () => {},
};

describe('OpportunityCard', () => {
  it('renders rank, score, title, type chip and why', () => {
    render(<OpportunityCard {...cardProps} opportunity={opp()} />);
    expect(screen.getByRole('heading', { name: 'Tailoring from home' })).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Local business')).toBeInTheDocument();
    expect(screen.getByText('Fits stitching skills.')).toBeInTheDocument();
  });

  it('labels the income as an estimate with an explanatory tooltip', () => {
    render(<OpportunityCard {...cardProps} opportunity={opp()} />);
    expect(screen.getByText('Estimate')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Why this is an estimate' }),
    ).toBeInTheDocument();
  });

  it('renders evidence and the 7-step timeline', () => {
    render(<OpportunityCard {...cardProps} opportunity={opp()} />);
    expect(screen.getByText('Local demand noted')).toBeInTheDocument();
    expect(screen.getByText('Day 1:')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).not.toHaveLength(0);
  });

  it('copies the plan and offers print', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<OpportunityCard {...cardProps} opportunity={opp()} />);
    await user.click(screen.getByRole('button', { name: /copy 7-day plan/i }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('Day 1: a'),
    );
    expect(writeText.mock.calls[0]?.[0]).toContain('Day 7: g');
    await user.click(screen.getByRole('button', { name: /print plan/i }));
  });

  it('shows weighted breakdown bars, the formula and adjustments', () => {
    render(<OpportunityCard {...cardProps} opportunity={opp()} />);
    expect(
      screen.getByRole('img', { name: 'Demand: 21.0 of 30 weighted points' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Fit: 18.0 of 20 weighted points' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Low competition: 9.0 of 15 weighted points' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Final formula/)).toBeInTheDocument();
    expect(screen.getByText(/Trust capped/)).toBeInTheDocument();
  });

  it('wires the compare checkbox', async () => {
    const user = userEvent.setup();
    const onCompareChange = vi.fn();
    render(<OpportunityCard {...cardProps} onCompareChange={onCompareChange} opportunity={opp()} />);
    await user.click(screen.getByRole('checkbox', { name: /compare tailoring from home/i }));
    expect(onCompareChange).toHaveBeenCalledWith(true);
  });
});
