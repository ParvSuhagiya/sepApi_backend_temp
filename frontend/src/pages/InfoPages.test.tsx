import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HowItWorksPage } from './HowItWorksPage';
import { PrivacyPage } from './PrivacyPage';
import { TermsPage } from './TermsPage';
import { ResponsibleUsePage } from './ResponsibleUsePage';

describe('informational pages', () => {
  it('explains sources, EarnScore weights, Scam Shield limits and caching', () => {
    render(
      <MemoryRouter>
        <HowItWorksPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /how earnradar works/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /where the data comes from/i })).toBeInTheDocument();
    expect(screen.getByText(/30% demand, 20% fit, 20% trust/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /scam shield/i })).toBeInTheDocument();
    expect(screen.getByText(/cannot guarantee a job is safe/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /caching and credits/i })).toBeInTheDocument();
  });

  it('states exactly what the browser stores', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Privacy' })).toBeInTheDocument();
    expect(screen.getByText(/exactly one thing.*theme/i)).toBeInTheDocument();
    expect(screen.getByText(/no third-party trackers/i)).toBeInTheDocument();
  });

  it('states estimates and verification duties', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Terms' })).toBeInTheDocument();
    expect(screen.getByText(/information, not guarantees/i)).toBeInTheDocument();
  });

  it('covers messaging etiquette and DPDP awareness as guidance, not legal advice', () => {
    render(
      <MemoryRouter>
        <ResponsibleUsePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Responsible use' })).toBeInTheDocument();
    expect(screen.getByText(/not legal advice/i)).toBeInTheDocument();
    expect(screen.getByText(/DPDP Act 2023/i)).toBeInTheDocument();
    expect(screen.getByText(/opt-out line/i)).toBeInTheDocument();
  });
});
