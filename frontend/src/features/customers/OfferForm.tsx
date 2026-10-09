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
      className="rounded-3xl border border-line/80 bg-raised/90 p-5 sm:p-7 shadow-lg backdrop-blur-xl transition-all"
    >
      <div className="grid gap-5 md:grid-cols-4">
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
            hint="Describe freely. Press Cmd/Ctrl+Enter to submit."
          />
        </div>
        <div>
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
              hint="Subscription cost"
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
              className="mt-2.5 h-2 w-full cursor-pointer rounded-lg bg-surface accent-brand"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-semibold text-ink">Try an example:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => {
                setValues({ ...example.values });
              }}
              className="rounded-full border border-line/80 bg-surface/80 px-2.5 py-1 text-xs font-semibold text-brand transition-all hover:bg-brand/10 hover:border-brand/40"
            >
              Try: {example.label}
            </button>
          ))}
        </div>

        <div>
          <Button type="submit" disabled={loading} loading={loading} className="w-full sm:w-auto">
            <Users className="h-4 w-4" />
            <span>{loading ? 'Finding…' : 'Find customers'}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
