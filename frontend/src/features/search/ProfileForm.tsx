import { useState } from 'react';
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
    label: 'Try: Tailoring in Pune',
    values: { skills: 'tailoring, stitching', city: 'Pune', hours: '10', budget: '0' },
  },
  {
    label: 'Try: Delivery in Ahmedabad',
    values: { skills: 'delivery, driving', city: 'Ahmedabad', hours: '15', budget: '0' },
  },
  {
    label: 'Try: Python demo',
    values: { skills: 'Python basics, Excel', city: 'Ahmedabad', hours: '10', budget: '0' },
  },
];

export interface ProfileFormProps {
  loading: boolean;
  initial?: Partial<ProfileValues>;
  onSubmit: (payload: ValidProfile) => void;
}

/** Income profile form. Validation mirrors the backend; integers are cast on submit. */
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
    >
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <Textarea
            id="profile-skills"
            label="Skills"
            placeholder="e.g. tailoring, stitching"
            rows={3}
            maxLength={300}
            value={values.skills}
            onChange={(event) => set('skills', event.target.value)}
            onKeyDown={handleKeyDown}
            error={errors.skills}
            hint="Separate skills with commas. Cmd/Ctrl+Enter submits."
          />
        </div>
        <div>
          <Input
            id="profile-city"
            label="City"
            type="text"
            placeholder="e.g. Pune"
            autoComplete="address-level2"
            value={values.city}
            onChange={(event) => set('city', event.target.value)}
            error={errors.city}
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
              className="mt-2 h-[44px] w-full accent-brand"
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
              hint="Rupees you can spend to start"
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
          {loading ? 'Searching…' : 'Find income ideas'}
        </Button>
      </div>
    </form>
  );
}
