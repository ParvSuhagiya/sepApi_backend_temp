import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBadge, ScoreRing } from './ScoreBadge';
import { RiskBadge } from './RiskBadge';

describe('ScoreBadge', () => {
  it('pairs number, label and tone', () => {
    render(<ScoreBadge score={82} label="Lead score" />);
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('Lead score')).toBeInTheDocument();
  });

  it('renders the ring with an accessible name', () => {
    render(<ScoreRing score={60} label="EarnScore" />);
    expect(screen.getByRole('img', { name: 'EarnScore 60' })).toBeInTheDocument();
  });
});

describe('RiskBadge', () => {
  it('labels every level in words', () => {
    const { rerender } = render(<RiskBadge risk="Low" />);
    expect(screen.getByText('Low risk')).toBeInTheDocument();
    rerender(<RiskBadge risk="Medium" />);
    expect(screen.getByText('Medium risk')).toBeInTheDocument();
    rerender(<RiskBadge risk="High" />);
    expect(screen.getByText('High risk')).toBeInTheDocument();
  });
});
