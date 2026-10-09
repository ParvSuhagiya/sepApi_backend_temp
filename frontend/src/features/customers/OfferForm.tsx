import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input, NumberField, Textarea } from '../../components/ui/fields';
import {
  toOfferPayload,
  validateOffer,
  type OfferErrors,
  type OfferValues,
  type ValidOffer,
} from '../../lib/leadsValidation';

const DEFAULTS: OfferValues = { offer: '', city: '', monthly_price: '', max_leads: '10' };

const EXAMPLES: ReadonlyArray<{ label: string; values: OfferValues }> = [
  {
    label: 'Try: Restaurant system',
    values: {
      offer:
        'Restaurant management system for mid level restaurants with waiter manager and cook for billing orders and staff duties',
      city: 'Ahmedabad',
      monthly_price: '800',
      max_leads: '10',
    },
  },
  {
    label: 'Try: Gym software',
    values: {
      offer:
        'Gym management software for small gyms with membership tracking attendance and fee reminders for owners and trainers',
      city: 'Pune',
      monthly_price: '',
      max_leads: '10',
    },
  },
  {
    label: 'Try: Salon booking',
    values: {
      offer:
        'Salon booking software for local salons with appointment scheduling reminders and billing for owners and staff',
      city: 'Ahmedabad',
      monthly_price: '500',
      max_leads: '8',
    },
  },
];

export interface OfferFormProps {
  loading: boolean;
  initial?: Partial<OfferValues>;
  onSubmit: (payload: ValidOffer) => void;
}

/** Customer offer form. Validation mirrors the backend; integers cast on submit. */
export function OfferForm({ loading, initial, onSubmit }: OfferFormProps) {
  const [values, setValues] = useState<OfferValues>({ ...DEFAULTS, ...initial });
  const [submitted, setSubmitted] = useState(false);

  const errors: OfferErrors = submitted ? validateOffer(values) : {};

  function set(field: keyof OfferValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function submit() {
    const next = validateOffer(values);
    setSubmitted(true);
    if (Object.keys(next).length > 0) {
      const first = (['offer', 'city', 'monthly_price', 'max_leads'] as const).find(
        (f) => next[f],
      );
      if (first) {
        const ids: Record<typeof first, string> = {
          offer: 'offer-text',
          city: 'offer-city',
          monthly_price: 'offer-price',
          max_leads: 'offer-max-leads',
        };
        document.getElementById(ids[first])?.focus();
      }
      return;
    }
    onSubmit(toOfferPayload(values));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      aria-label="Your product offer"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <Textarea
            id="offer-text"
            label="Describe what you sell and who should buy it"
            placeholder="e.g. billing software for mid-level restaurants with waiters and managers"
            rows={4}
            maxLength={1000}
            value={values.offer}
            onChange={(event) => set('offer', event.target.value)}
            onKeyDown={handleKeyDown}
            error={errors.offer}
            hint="Paste freely — no need to restructure your text. Cmd/Ctrl+Enter submits."
          />
        </div>
        <div>
          <Input
            id="offer-city"
            label="City"
            type="text"
            placeholder="e.g. Ahmedabad"
            autoComplete="address-level2"
            value={values.city}
            onChange={(event) => set('city', event.target.value)}
            error={errors.city}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 md:col-span-1 md:grid-cols-2">
          <div>
            <NumberField
              id="offer-price"
              label="Monthly price"
              prefix="₹"
              min={0}
              max={1000000}
              step={1}
              placeholder="Optional"
              value={values.monthly_price}
              onChange={(event) => set('monthly_price', event.target.value)}
              error={errors.monthly_price}
              hint="Optional, per month"
            />
          </div>
          <div>
            <NumberField
              id="offer-max-leads"
              label="Max leads"
              min={5}
              max={20}
              step={1}
              value={values.max_leads}
              onChange={(event) => set('max_leads', event.target.value)}
              error={errors.max_leads}
            />
            <label htmlFor="offer-max-leads-slider" className="sr-only">
              Max leads slider
            </label>
            <input
              id="offer-max-leads-slider"
              type="range"
              min={5}
              max={20}
              step={1}
              value={values.max_leads === '' ? 5 : Number(values.max_leads) || 5}
              onChange={(event) => set('max_leads', event.target.value)}
              className="mt-2 h-[44px] w-full accent-brand"
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">
        Not sure where to start?{' '}
        {EXAMPLES.map((example, index) => (
          <span key={example.label}>
            {index > 0 ? ' · ' : null}
            <button
              type="button"
              onClick={() => {
                setValues({ ...example.values });
              }}
              className="rounded-sm font-semibold text-brand underline"
            >
              {example.label}
            </button>
          </span>
        ))}
      </p>
      <div className="mt-4">
        <Button type="submit" disabled={loading} loading={loading}>
          {loading ? 'Finding…' : 'Find customers'}
        </Button>
      </div>
    </form>
  );
}
