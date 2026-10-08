import { useState } from "react";

const initialValues = { skills: "", city: "", hours: "10", budget: "0" };

export default function ProfileForm({ loading, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function validate() {
    const next = {};
    const skills = values.skills.trim();
    if (skills.length < 2 || skills.length > 300) {
      next.skills = "Tell us your skills (2–300 characters).";
    }
    const city = values.city.trim();
    if (city.length < 2 || city.length > 80) {
      next.city = "Tell us your city (2–80 characters).";
    }
    const hours = Number(values.hours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 168) {
      next.hours = "Hours must be a whole number from 1 to 168.";
    }
    const budget = Number(values.budget);
    if (!Number.isInteger(budget) || budget < 0) {
      next.budget = "Budget must be 0 or more.";
    }
    return next;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({
      skills: values.skills.trim(),
      city: values.city.trim(),
      hours: parseInt(values.hours, 10),
      budget: parseInt(values.budget, 10),
    });
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-700";

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Your profile">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label htmlFor="profile-skills" className="block text-sm font-medium text-slate-700">
            Skills
          </label>
          <input
            id="profile-skills"
            name="skills"
            type="text"
            className={inputClass}
            placeholder="e.g. tailoring, stitching"
            value={values.skills}
            onChange={(e) => set("skills", e.target.value)}
            aria-invalid={Boolean(errors.skills)}
            aria-describedby={errors.skills ? "profile-skills-error" : undefined}
          />
          {errors.skills && (
            <p id="profile-skills-error" className="mt-1 text-sm text-red-700">{errors.skills}</p>
          )}
        </div>
        <div>
          <label htmlFor="profile-city" className="block text-sm font-medium text-slate-700">
            City
          </label>
          <input
            id="profile-city"
            name="city"
            type="text"
            className={inputClass}
            placeholder="e.g. Pune"
            value={values.city}
            onChange={(e) => set("city", e.target.value)}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "profile-city-error" : undefined}
          />
          {errors.city && (
            <p id="profile-city-error" className="mt-1 text-sm text-red-700">{errors.city}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 md:col-span-1 md:grid-cols-2">
          <div>
            <label htmlFor="profile-hours" className="block text-sm font-medium text-slate-700">
              Hours/week
            </label>
            <input
              id="profile-hours"
              name="hours"
              type="number"
              min="1"
              max="168"
              className={inputClass}
              value={values.hours}
              onChange={(e) => set("hours", e.target.value)}
              aria-invalid={Boolean(errors.hours)}
              aria-describedby={errors.hours ? "profile-hours-error" : undefined}
            />
            {errors.hours && (
              <p id="profile-hours-error" className="mt-1 text-sm text-red-700">{errors.hours}</p>
            )}
          </div>
          <div>
            <label htmlFor="profile-budget" className="block text-sm font-medium text-slate-700">
              Budget (₹)
            </label>
            <input
              id="profile-budget"
              name="budget"
              type="number"
              min="0"
              step="1"
              className={inputClass}
              value={values.budget}
              onChange={(e) => set("budget", e.target.value)}
              aria-invalid={Boolean(errors.budget)}
              aria-describedby={errors.budget ? "profile-budget-error" : undefined}
            />
            {errors.budget && (
              <p id="profile-budget-error" className="mt-1 text-sm text-red-700">{errors.budget}</p>
            )}
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-4 min-h-[40px] w-full rounded-md bg-green-700 px-4 py-2 text-base font-semibold text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
      >
        {loading ? "Searching…" : "Find income ideas"}
      </button>
    </form>
  );
}
