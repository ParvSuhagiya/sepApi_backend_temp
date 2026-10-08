import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input, NumberField, Select, Textarea } from './fields';

describe('fields', () => {
  it('wires error and hint to the input', () => {
    render(<Input id="city" label="City" error="Too short" hint="Where you live" />);
    const input = screen.getByLabelText('City');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'city-error city-hint');
    expect(screen.getByText('Too short')).toBeInTheDocument();
  });

  it('shows a character counter on Textarea', () => {
    render(<Textarea id="offer" label="Offer" maxLength={100} value="Hello" onChange={() => {}} />);
    expect(screen.getByText('5/100 characters')).toBeInTheDocument();
  });

  it('renders numeric and select inputs', () => {
    render(
      <>
        <NumberField id="price" label="Price" min={0} />
        <Select
          id="city-size"
          label="City size"
          options={[
            { value: 's', label: 'Small' },
            { value: 'l', label: 'Large' },
          ]}
        />,
      </>,
    );
    expect(screen.getByLabelText('Price')).toHaveAttribute('type', 'number');
    expect(screen.getByRole('combobox', { name: 'City size' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Small' })).toBeInTheDocument();
  });
});
