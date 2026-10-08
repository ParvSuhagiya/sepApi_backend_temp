import { useState } from "react";

const OFFER_MIN = 20;
const OFFER_MAX = 1000;
const CITY_MIN = 2;
const CITY_MAX = 80;

const initialValues = { offer: "", city: "", price: "" };

export default function OfferForm({ loading, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function validate() {
    const next = {};
    const offer = values.offer.trim();
    if (offer.length < OFFER_MIN || offer.length > OFFER_MAX) {
      next.offer = `Describe what you sell in ${OFFER_MIN}–${OFFER_MAX} characters.`;
    }
    const city = values.city.trim();
    if (city.length < CITY_MIN || city.length > CITY_MAX) {
      next.city = `Tell us the city (${CITY_MIN}–${CITY_MAX} characters).`;
    }
    const price = values.price.trim();
    if (price !== "" && !/^\d+$/.test(price)) {
      next.price = "Monthly price must be a whole number, 0 or more (or leave it blank).";
    }
    return next;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const body = {
      offer: values.offer.trim(),
      city: values.city.trim(),
    };
    if (values.price.trim() !== "") {
      body.monthly_price = parseInt(values.price.trim(), 10);
    }
    onSubmit(body);
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-700";
  const count = values.offer.length;

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Your product">
      <div>
        <label htmlFor="offer-text" className="block text-sm font-medium text-slate-700">
          Describe what you sell and who should buy it
        </label>
        <textarea
          id="offer-text"
          name="offer"
          rows={5}
          className={inputClass}
          placeholder="e.g. I made a restaurant billing system for mid-level restaurants…"
          value={values.offer}
          onChange={(e) => set("offer", e.target.value)}
          aria-invalid={Boolean(errors.offer)}
          aria-describedby={errors.offer ? "offer-text-error offer-text-count" : "offer-text-count"}
        />
        <p id="offer-text-count" className="mt-1 text-xs text-slate-500">
          {count}/{OFFER_MAX} characters (minimum {OFFER_MIN})
        </p>
        {errors.offer && (
          <p id="offer-text-error" className="mt-1 text-sm text-red-700">{errors.offer}</p>
        )}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="offer-city" className="block text-sm font-medium text-slate-700">
            City
          </label>
          <input
            id="offer-city"
            name="city"
            type="text"
            className={inputClass}
            placeholder="e.g. Ahmedabad"
            value={values.city}
            onChange={(e) => set("city", e.target.value)}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "offer-city-error" : undefined}
          />
          {errors.city && (
            <p id="offer-city-error" className="mt-1 text-sm text-red-700">{errors.city}</p>
          )}
        </div>
        <div>
          <label htmlFor="offer-price" className="block text-sm font-medium text-slate-700">
            Monthly price (₹, optional)
          </label>
          <input
            id="offer-price"
            name="price"
            type="text"
            inputMode="numeric"
            className={inputClass}
            placeholder="e.g. 800"
            value={values.price}
            onChange={(e) => set("price", e.target.value)}
            aria-invalid={Boolean(errors.price)}
            aria-describedby={errors.price ? "offer-price-error" : undefined}
          />
          {errors.price && (
            <p id="offer-price-error" className="mt-1 text-sm text-red-700">{errors.price}</p>
          )}
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-4 min-h-[40px] w-full rounded-md bg-green-700 px-4 py-2 text-base font-semibold text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
      >
        {loading ? "Finding customers…" : "Find customers"}
      </button>
    </form>
  );
}
