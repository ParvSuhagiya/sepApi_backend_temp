import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TrendChart } from './TrendChart';

const POINTS = [
  { date: '2026-01-01', value: 20 },
  { date: '2026-02-01', value: 35 },
  { date: '2026-03-01', value: 28 },
];

describe('TrendChart', () => {
  it('renders nothing without data', () => {
    const { container } = render(<TrendChart keyword={null} growth={{}} points={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the keyword, growth and chart with a table fallback', () => {
    render(<TrendChart keyword="tailoring" growth={{ tailoring: 12 }} points={POINTS} />);
    expect(screen.getByRole('heading', { name: /tailoring.*\+12%/i })).toBeInTheDocument();
  });

  it('toggles between keywords', async () => {
    const user = userEvent.setup();
    render(
      <TrendChart
        keyword="tailoring"
        growth={{ tailoring: 12, stitching: -4 }}
        points={POINTS}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'stitching' }));
    expect(screen.getByRole('heading', { name: /stitching.*-4%/i })).toBeInTheDocument();
    expect(screen.getByText(/no chart data for stitching/i)).toBeInTheDocument();
  });

  it('exposes the data table', async () => {
    const user = userEvent.setup();
    render(<TrendChart keyword="tailoring" growth={{ tailoring: 12 }} points={POINTS} />);
    await user.click(screen.getByText(/data table/i));
    const table = screen.getByRole('table');
    expect(table).toHaveTextContent('2026-02-01');
    expect(table).toHaveTextContent('35');
  });
});
