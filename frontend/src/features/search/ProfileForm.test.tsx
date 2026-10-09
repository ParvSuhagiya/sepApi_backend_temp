import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProfileForm } from './ProfileForm';

describe('ProfileForm', () => {
  it('shows validation errors on empty submit and blocks submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm loading={false} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /find income ideas/i }));
    expect(screen.getByText(/skills \(2–300 characters\)/i)).toBeInTheDocument();
    expect(screen.getByText(/city \(2–80 characters\)/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values with integers cast', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm loading={false} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/skills/i), 'tailoring');
    await user.type(screen.getByLabelText(/^city$/i), 'Pune');
    const hours = screen.getByLabelText(/hours per week$/i);
    await user.clear(hours);
    await user.type(hours, '12');
    await user.click(screen.getByRole('button', { name: /find income ideas/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      skills: 'tailoring',
      city: 'Pune',
      hours: 12,
      budget: 0,
    });
    expect(typeof onSubmit.mock.calls[0][0].hours).toBe('number');
  });

  it('fills the form from an example profile', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm loading={false} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /try: python demo/i }));
    expect(screen.getByLabelText(/skills/i)).toHaveValue('Python basics, Excel');
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('Ahmedabad');
    await user.click(screen.getByRole('button', { name: /find income ideas/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      skills: 'Python basics, Excel',
      city: 'Ahmedabad',
      hours: 10,
      budget: 0,
    });
  });

  it('disables submit while loading', () => {
    render(<ProfileForm loading onSubmit={() => {}} />);
    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled();
  });

  it('submits on Cmd+Enter from the skills textarea', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm loading={false} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/skills/i), 'tailoring, stitching');
    await user.type(screen.getByLabelText(/^city$/i), 'Pune');
    await user.click(screen.getByLabelText(/skills/i));
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows a live character counter and syncs the hours slider', async () => {
    const user = userEvent.setup();
    render(<ProfileForm loading={false} onSubmit={() => {}} />);
    expect(screen.getByText(/0\/300 characters/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/skills/i), 'abc');
    expect(screen.getByText(/3\/300 characters/)).toBeInTheDocument();
    const slider = screen.getByLabelText(/hours per week slider/i);
    fireEvent.change(slider, { target: { value: '20' } });
    expect(screen.getByLabelText(/hours per week$/i)).toHaveValue(20);
  });
});
