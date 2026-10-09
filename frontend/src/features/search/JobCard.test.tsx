import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { JobResult } from '../../api/schemas';
import { JobCard } from './JobCard';

function job(overrides: Partial<JobResult> = {}): JobResult {
  return {
    title: 'Tailor needed',
    company: 'ABC Tailors',
    location: 'Pune',
    via: 'Indeed',
    salary: '₹12,000/month',
    desc: 'Stitching and alteration work.\nSecond line.\nThird line.\nFourth line.',
    link: 'https://example.test/apply/1',
    flags: ['Asks for an upfront fee'],
    risk: 'Low',
    ...overrides,
  };
}

const props = { highlighted: false, onSelect: () => {} };

describe('JobCard', () => {
  it.each([
    ['Low', 'Low risk'],
    ['Medium', 'Medium risk'],
    ['High', 'High risk'],
  ] as const)('shows the %s text risk label', (risk, label) => {
    render(<JobCard job={job({ risk })} {...props} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('shows flags as chips and a caution panel only for high risk', () => {
    const { rerender } = render(<JobCard job={job({ risk: 'High' })} {...props} />);
    expect(screen.getByText('Asks for an upfront fee')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/do not pay any fee/i);
    rerender(<JobCard job={job({ risk: 'Low' })} {...props} />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('falls back when salary is missing', () => {
    render(<JobCard job={job({ salary: null })} {...props} />);
    expect(screen.getByText('Salary not listed')).toBeInTheDocument();
  });

  it('truncates the description with a show more toggle', async () => {
    const user = userEvent.setup();
    render(<JobCard job={job()} {...props} />);
    const toggle = screen.getByRole('button', { name: /show more/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: /show less/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('links applications to a new tab', () => {
    render(<JobCard job={job()} highlighted onSelect={() => {}} />);
    const apply = screen.getByRole('link', { name: /apply for this job/i });
    expect(apply).toHaveAttribute('target', '_blank');
    expect(apply).toHaveAttribute('rel', 'noreferrer');
    expect(apply).toHaveTextContent(/opens in new tab/);
  });

  it('notifies selection through the map button', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<JobCard job={job()} highlighted={false} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: /show on map/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('marks the pressed state when highlighted', () => {
    render(<JobCard job={job()} highlighted onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /showing on map/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
