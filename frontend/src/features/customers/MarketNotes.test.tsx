import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarketNotes } from './MarketNotes';

describe('MarketNotes', () => {
  it('lists competitor notes', () => {
    render(<MarketNotes notes={['Several vendors sell billing software in India.']} />);
    expect(
      screen.getByText('Several vendors sell billing software in India.'),
    ).toBeInTheDocument();
  });

  it('labels a missing price clearly', () => {
    render(<MarketNotes notes={['price not found']} />);
    expect(screen.getByText('Price not found')).toBeInTheDocument();
    expect(screen.getByText(/wasn't found in public results/i)).toBeInTheDocument();
  });

  it('notes the empty case', () => {
    render(<MarketNotes notes={[]} />);
    expect(screen.getByText(/no competitor notes/i)).toBeInTheDocument();
  });
});
