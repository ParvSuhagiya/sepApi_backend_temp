import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input, NumberField, Textarea } from '../../components/ui/fields';
import {
  toProfilePayload,
  validateProfile,
  type ProfileErrors,
  type ProfileValues,
  type ValidProfile,
} from '../../lib/validation';

const DEFAULTS: ProfileValues = { skills: '', city: '', hours: '10', budget: '0' };

const EXAMPLES: ReadonlyArray<{ label: string; values: ProfileValues }> = [
  {
    label: 'Python demo',
    values: { skills: 'Python basics, Excel', city: 'Ahmedabad', hours: '10', budget: '0' },
  },
  {
    label: 'Tailoring in Pune',
    values: { skills: 'tailoring, stitching', city: 'Pune', hours: '10', budget: '0' },
  },
  {
    label: 'Delivery in Ahmedabad',
    values: { skills: 'delivery, driving', city: 'Ahmedabad', hours: '15', budget: '0' },
  },
];

export interface ProfileFormProps {
  loading: boolean;
  initial?: Partial<ProfileValues>;
  onSubmit: (payload: ValidProfile) => void;
}

/** Income profile form with modern glassmorphism styling and quick fill prompts. */
export function ProfileForm({ loading, initial, onSubmit }: ProfileFormProps) {
  const [values, setValues] = useState<ProfileValues>({ ...DEFAULTS, ...initial });
  const [submitted, setSubmitted] = useState(false);

  const errors: ProfileErrors = submitted ? validateProfile(values) : {};

  function set(field: keyof ProfileValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function submit() {
    const next = validateProfile(values);
    setSubmitted(true);
    if (Object.keys(next).length > 0) {
      const first = (['skills', 'city', 'hours', 'budget'] as const).find((f) => next[f]);
      if (first) {
        const ids: Record<typeof first, string> = {
          skills: 'profile-skills',
          city: 'profile-city',
          hours: 'profile-hours',
          budget: 'profile-budget',
        };
        document.getElementById(ids[first])?.focus();
      }
      return;
    }
    onSubmit(toProfilePayload(values));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      aria-label="Your profile"
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
            id="profile-skills"
            label="Skills & interests"
            placeholder="e.g. tailoring, stitching, graphic design, cooking"
            rows={3}
            maxLength={300}
            value={values.skills}
            onChange={(event) => set('skills', event.target.value)}
            onKeyDown={handleKeyDown}
            error={errors.skills}
            hint="Separate skills with commas. Press Cmd/Ctrl+Enter to submit."
          />
        </div>
        <div>
          <Input
            id="profile-city"
            label="City"
            type="text"
            placeholder="e.g. Pune, Ahmedabad"
            autoComplete="address-level2"
            value={values.city}
            onChange={(event) => set('city', event.target.value)}
            error={errors.city}
            hint="Indian city to search opportunities in"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 md:col-span-1 md:grid-cols-2">
          <div>
            <NumberField
              id="profile-hours"
              label="Hours per week"
              min={1}
              max={168}
              step={1}
              value={values.hours}
              onChange={(event) => set('hours', event.target.value)}
              error={errors.hours}
            />
            <label htmlFor="profile-hours-slider" className="sr-only">
              Hours per week slider
            </label>
            <input
              id="profile-hours-slider"
              type="range"
              min={1}
              max={168}
              step={1}
              value={values.hours === '' ? 1 : Number(values.hours) || 1}
              onChange={(event) => set('hours', event.target.value)}
              className="mt-2.5 h-2 w-full cursor-pointer rounded-lg bg-surface accent-brand"
            />
          </div>
          <div>
            <NumberField
              id="profile-budget"
              label="Starting budget"
              prefix="₹"
              min={0}
              step={1}
              value={values.budget}
              onChange={(event) => set('budget', event.target.value)}
              error={errors.budget}
              hint="Initial capital"
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
            <Sparkles className="h-4 w-4" />
            <span>{loading ? 'Searching…' : 'Find income ideas'}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
