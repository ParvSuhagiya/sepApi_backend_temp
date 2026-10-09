import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { JobResult } from '../../api/schemas';
import { JobList } from './JobList';

function job(title: string, overrides: Partial<JobResult> = {}): JobResult {
  return {
    title,
    company: 'ABC',
    location: 'Pune',
    desc: 'Work',
    flags: [],
    risk: 'Low',
    ...overrides,
  };
}

const JOBS = [
  job('Safe Tailor', { risk: 'Low', salary: '₹10,000' }),
  job('Risky Data Entry', { risk: 'High', salary: null, flags: ['Asks for an upfront fee'] }),
  job('Remote Typist', { risk: 'Medium', location: 'Remote', salary: '₹8,000' }),
  job('No Pay Helper', { risk: 'Low', salary: '  ' }),
];

function titles(): string[] {
  return screen
    .getAllByRole('article')
    .map((card) => within(card).getByRole('heading').textContent ?? '');
}

describe('JobList', () => {
  it('shows the scam disclaimer and sorts safest first by default', () => {
    render(<JobList jobs={JOBS} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/scam shield checks text patterns/i)).toBeInTheDocument();
    expect(titles()).toEqual(['Safe Tailor', 'No Pay Helper', 'Remote Typist', 'Risky Data Entry']);
  });

  it('filters by risk level', async () => {
    const user = userEvent.setup();
    render(<JobList jobs={JOBS} selectedId={null} onSelect={() => {}} />);
    await user.click(screen.getByRole('checkbox', { name: 'High' }));
    expect(titles()).toEqual(['Safe Tailor', 'No Pay Helper', 'Remote Typist']);
    expect(screen.getByText('3 jobs')).toBeInTheDocument();
  });

  it('filters by salary presence', async () => {
    const user = userEvent.setup();
    render(<JobList jobs={JOBS} selectedId={null} onSelect={() => {}} />);
    await user.click(screen.getByRole('checkbox', { name: 'Has salary' }));
    expect(titles()).toEqual(['Safe Tailor', 'Remote Typist']);
  });

  it('filters remote versus on-site', async () => {
    const user = userEvent.setup();
    render(<JobList jobs={JOBS} selectedId={null} onSelect={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Remote' }));
    expect(titles()).toEqual(['Remote Typist']);
    await user.click(screen.getByRole('button', { name: 'On-site' }));
    expect(titles()).toEqual(['Safe Tailor', 'No Pay Helper', 'Risky Data Entry']);
  });

  it('sorts salary-listed first and shows the empty state', async () => {
    const user = userEvent.setup();
    render(<JobList jobs={JOBS} selectedId={null} onSelect={() => {}} />);
    await user.selectOptions(screen.getByLabelText(/sort jobs/i), 'salary');
    expect(titles()).toEqual(['Safe Tailor', 'Remote Typist', 'Risky Data Entry', 'No Pay Helper']);
    await user.click(screen.getByRole('button', { name: 'Remote' }));
    await user.click(screen.getByRole('checkbox', { name: 'High' }));
    await user.click(screen.getByRole('checkbox', { name: 'Medium' }));
    await user.click(screen.getByRole('checkbox', { name: 'Low' }));
    expect(
      screen.getByText(/no live jobs found for this search/i),
    ).toBeInTheDocument();
  });

  it('notifies selection to the parent', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<JobList jobs={JOBS} selectedId="job-0" onSelect={onSelect} />);
    const card = screen.getByRole('heading', { name: 'Risky Data Entry' }).closest('article');
    if (!card) throw new Error('card missing');
    await user.click(within(card).getByRole('button', { name: /show on map/i }));
    expect(onSelect).toHaveBeenCalledWith('job-1');
  });
});
