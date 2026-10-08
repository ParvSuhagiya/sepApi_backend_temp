/**
 * Form validation rules, ported from the previous ProfileForm component so
 * the rebuilt forms keep identical behavior. Pure functions: input strings
 * in, field errors out.
 */

export interface ProfileValues {
  skills: string;
  city: string;
  hours: string;
  budget: string;
}

export interface ValidProfile {
  skills: string;
  city: string;
  hours: number;
  budget: number;
}

export type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;

export function validateProfile(values: ProfileValues): ProfileErrors {
  const next: ProfileErrors = {};
  const skills = values.skills.trim();
  if (skills.length < 2 || skills.length > 300) {
    next.skills = 'Tell us your skills (2–300 characters).';
  }
  const city = values.city.trim();
  if (city.length < 2 || city.length > 80) {
    next.city = 'Tell us your city (2–80 characters).';
  }
  const hours = Number(values.hours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
    next.hours = 'Hours must be a whole number from 1 to 168.';
  }
  const budget = Number(values.budget);
  if (!Number.isInteger(budget) || budget < 0) {
    next.budget = 'Budget must be 0 or more.';
  }
  return next;
}

/** Cast a validated profile form to the API payload (integers, trimmed). */
export function toProfilePayload(values: ProfileValues): ValidProfile {
  return {
    skills: values.skills.trim(),
    city: values.city.trim(),
    hours: parseInt(values.hours, 10),
    budget: parseInt(values.budget, 10),
  };
}
