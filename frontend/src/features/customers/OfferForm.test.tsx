import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OfferForm } from './OfferForm';

describe('OfferForm', () => {
  it('shows validation errors on empty submit and blocks submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OfferForm loading={false} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /find customers/i }));
    expect(screen.getByText(/offer \(20–1000 characters\)/i)).toBeInTheDocument();
    expect(screen.getByText(/city \(2–80 characters\)/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('flags an out-of-range max leads on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OfferForm loading={false} onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText(/describe what you sell/i),
      'Restaurant billing software for local eateries and staff',
    );
    await user.type(screen.getByLabelText(/^city$/i), 'Ahmedabad');
    const maxLeads = screen.getByLabelText(/^max leads$/i);
    await user.clear(maxLeads);
    await user.type(maxLeads, '3');
    await user.click(screen.getByRole('button', { name: /find customers/i }));
    expect(screen.getByText(/whole number from 5 to 20/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values with integers cast and blank price omitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OfferForm loading={false} onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText(/describe what you sell/i),
      'Restaurant billing software for local eateries and staff',
    );
    await user.type(screen.getByLabelText(/^city$/i), 'Ahmedabad');
    await user.click(screen.getByRole('button', { name: /find customers/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      offer: 'Restaurant billing software for local eateries and staff',
      city: 'Ahmedabad',
      max_leads: 10,
    });
    expect(typeof onSubmit.mock.calls[0][0].max_leads).toBe('number');
  });

  it('fills the form from the restaurant example', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OfferForm loading={false} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /try: restaurant system/i }));
    const offerBox = screen.getByLabelText(/describe what you sell/i) as HTMLTextAreaElement;
    expect(offerBox.value).toContain('Restaurant management system');
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('Ahmedabad');
    expect(screen.getByLabelText(/monthly price/i)).toHaveValue(800);
    await user.click(screen.getByRole('button', { name: /find customers/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      offer: expect.stringContaining('Restaurant management system'),
      city: 'Ahmedabad',
      monthly_price: 800,
      max_leads: 10,
    });
  });

  it('disables submit while loading', () => {
    render(<OfferForm loading onSubmit={() => {}} />);
    expect(screen.getByRole('button', { name: /finding/i })).toBeDisabled();
  });

  it('submits on Cmd+Enter from the offer textarea', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OfferForm loading={false} onSubmit={onSubmit} />);
    await user.type(
      screen.getByLabelText(/describe what you sell/i),
      'Gym management software for membership tracking and fees',
    );
    await user.type(screen.getByLabelText(/^city$/i), 'Pune');
    await user.click(screen.getByLabelText(/describe what you sell/i));
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows a live character counter and syncs the max-leads slider', async () => {
    const user = userEvent.setup();
    render(<OfferForm loading={false} onSubmit={() => {}} />);
    expect(screen.getByText(/0\/1000 characters/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/describe what you sell/i), 'abc');
    expect(screen.getByText(/3\/1000 characters/)).toBeInTheDocument();
    const slider = screen.getByLabelText(/max leads slider/i);
    fireEvent.change(slider, { target: { value: '15' } });
    expect(screen.getByLabelText(/^max leads$/i)).toHaveValue(15);
  });
});
