import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';

const TABS = [
  { id: 'income', label: 'Find income ideas' },
  { id: 'customers', label: 'Find customers' },
];

describe('Tabs', () => {
  it('marks the active tab selected with roving tabindex', () => {
    render(<Tabs tabs={TABS} activeId="income" onChange={() => {}} label="Modes" />);
    expect(screen.getByRole('tablist', { name: 'Modes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Find income ideas' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Find income ideas' })).toHaveAttribute(
      'tabIndex',
      '0',
    );
    expect(screen.getByRole('tab', { name: 'Find customers' })).toHaveAttribute(
      'tabIndex',
      '-1',
    );
  });

  it('changes tab on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs tabs={TABS} activeId="income" onChange={onChange} label="Modes" />);
    await user.click(screen.getByRole('tab', { name: 'Find customers' }));
    expect(onChange).toHaveBeenCalledWith('customers');
  });

  it('moves with arrow keys, Home and End', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs tabs={TABS} activeId="income" onChange={onChange} label="Modes" />);
    screen.getByRole('tab', { name: 'Find income ideas' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('customers');
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith('income');
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenCalledWith('customers');
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenCalledWith('income');
  });
});
