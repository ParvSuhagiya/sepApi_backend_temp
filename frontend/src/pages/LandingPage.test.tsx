import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  it('shows the hero with both CTAs to the app routes', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { name: /realistic income ideas for india/i }),
    ).toBeInTheDocument();
    const primary = screen.getAllByRole('link', { name: 'Find my opportunities' });
    expect(primary[0]).toHaveAttribute('href', '/app/income');
    const secondary = screen.getAllByRole('link', { name: 'Find customers for my product' });
    expect(secondary[0]).toHaveAttribute('href', '/app/customers');
  });

  it('renders the product mock from real components', () => {
    renderLanding();
    expect(screen.getByLabelText('Example EarnRadar result')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'EarnScore 78' })).toBeInTheDocument();
    expect(screen.getByText('Low risk')).toBeInTheDocument();
  });

  it('covers steps, features, trust and FAQ', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Features' })).toBeInTheDocument();
    expect(screen.getByText('Ranked opportunities with EarnScore')).toBeInTheDocument();
    expect(screen.getByText('Scam Shield')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what we are/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Questions' })).toBeInTheDocument();
    expect(
      screen.getByText('Are the income figures guaranteed?', { selector: 'summary' }),
    ).toBeInTheDocument();
  });
});
