import { useState } from 'react';
import { Users } from 'lucide-react';
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
    label: 'Restaurant system',
    values: {
      offer:
        'Restaurant management system for mid level restaurants with waiter manager and cook for billing orders and staff duties',
      city: 'Ahmedabad',
      monthly_price: '800',
      max_leads: '10',
    },
  },
  {
    label: 'Gym software',
    values: {
      offer:
        'Gym management software for small gyms with membership tracking attendance and fee reminders for owners and trainers',
      city: 'Pune',
      monthly_price: '',
      max_leads: '10',
    },
  },
  {
    label: 'Salon booking',
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

/** Customer offer form with modern glassmorphism styling and quick fill prompts. */
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
      className="flex flex-col gap-4"
    >
      {/* Main textarea — full width */}
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
        hint="Describe freely. Press Cmd/Ctrl+Enter to submit."
      />

      {/* City — full width */}
      <Input
        id="offer-city"
        label="City"
        type="text"
        placeholder="e.g. Ahmedabad, Pune"
        autoComplete="address-level2"
        value={values.city}
        onChange={(event) => set('city', event.target.value)}
        error={errors.city}
        hint="City where your potential customers are located"
      />

      {/* Price + Max leads — side by side */}
      <div className="grid grid-cols-2 gap-3">
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
          hint="Subscription cost"
        />
        <div>
          <NumberField
            id="offer-max-leads"
            label="Max price leads"
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
            className="mt-2 h-1.5 w-full cursor-pointer rounded-full bg-line accent-brand"
          />
        </div>
      </div>

      {/* Footer: examples + submit */}
      <div className="flex flex-col gap-3 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted">Try an example:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => {
                setValues({ ...example.values });
              }}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-brand transition-all hover:bg-brand/10 hover:border-brand/40"
            >
              Try: {example.label}
            </button>
          ))}
        </div>
        <Button type="submit" disabled={loading} loading={loading} className="w-full">
          <Users className="h-4 w-4" />
          <span>{loading ? 'Finding…' : 'Find customers'}</span>
        </Button>
      </div>
    </form>
  );
}
