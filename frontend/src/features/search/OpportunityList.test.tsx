import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Opportunity } from '../../api/schemas';
import { OpportunityList } from './OpportunityList';

function opp(title: string, type: Opportunity['type'], earn_score: number): Opportunity {
  return {
    title,
    type,
    why: `Why ${title}.`,
    income_estimate: '₹5,000/month (estimate)',
    demand: 50,
    competition: 50,
    fit: 50,
    cost_ease: 50,
    trust: 50,
    evidence: [`Evidence for ${title}`],
    plan_7_days: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    earn_score,
    score_breakdown: {},
    adjustments: [],
  };
}

const ITEMS = [
  opp('Beta Job', 'job', 70),
  opp('Alpha Freelance', 'freelance', 90),
  opp('Gamma Content', 'content', 60),
  opp('Delta Local', 'local business', 80),
];

function titles(): string[] {
  return screen
    .getAllByRole('heading', { level: 4 })
    .map((heading) => heading.textContent ?? '');
}

describe('OpportunityList', () => {
  it('sorts by EarnScore descending by default', () => {
    render(<OpportunityList opportunities={ITEMS} />);
    expect(titles()).toEqual(['Alpha Freelance', 'Delta Local', 'Beta Job', 'Gamma Content']);
  });

  it('sorts by income type and filters with chips', async () => {
    const user = userEvent.setup();
    render(<OpportunityList opportunities={ITEMS} />);
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'type');
    expect(titles()).toEqual(['Beta Job', 'Alpha Freelance', 'Delta Local', 'Gamma Content']);
    await user.click(screen.getByRole('button', { name: 'Job' }));
    expect(titles()).toEqual(['Beta Job']);
    await user.click(screen.getByRole('button', { name: 'All types' }));
    expect(titles()).toHaveLength(4);
  });

  it('compares up to 3 opportunities side by side', async () => {
    const user = userEvent.setup();
    render(<OpportunityList opportunities={ITEMS} />);
    await user.click(screen.getByRole('checkbox', { name: /compare alpha freelance/i }));
    await user.click(screen.getByRole('checkbox', { name: /compare delta local/i }));
    await user.click(screen.getByRole('button', { name: /compare \(2\)/i }));
    const dialog = screen.getByRole('dialog', { name: /compare 2 opportunities/i });
    expect(within(dialog).getByText('Alpha Freelance')).toBeInTheDocument();
    expect(within(dialog).getByText('Delta Local')).toBeInTheDocument();
    expect(within(dialog).getByText('7-day plan steps')).toBeInTheDocument();
  });

  it('caps compare selection at 3', async () => {
    const user = userEvent.setup();
    render(<OpportunityList opportunities={ITEMS} />);
    await user.click(screen.getByRole('checkbox', { name: /compare alpha freelance/i }));
    await user.click(screen.getByRole('checkbox', { name: /compare delta local/i }));
    await user.click(screen.getByRole('checkbox', { name: /compare beta job/i }));
    expect(screen.getByText(/compare holds up to 3 opportunities/i)).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /compare gamma content/i }),
    ).toBeDisabled();
  });
});
