/**
 * Offer-form validation, mirroring `OfferInput` on the backend. Pure
 * functions: input strings in, field errors out.
 */

export interface OfferValues {
  offer: string;
  city: string;
  monthly_price: string;
  max_leads: string;
}

export interface ValidOffer {
  offer: string;
  city: string;
  monthly_price?: number;
  max_leads: number;
}

export type OfferErrors = Partial<Record<keyof OfferValues, string>>;

export function validateOffer(values: OfferValues): OfferErrors {
  const next: OfferErrors = {};
  const offer = values.offer.trim();
  if (offer.length < 20 || offer.length > 1000) {
    next.offer = 'Describe your offer (20–1000 characters).';
  }
  const city = values.city.trim();
  if (city.length < 2 || city.length > 80) {
    next.city = 'Tell us your city (2–80 characters).';
  }
  const priceRaw = values.monthly_price.trim();
  if (priceRaw !== '') {
    const price = Number(priceRaw);
    if (!Number.isInteger(price) || price < 0 || price > 1_000_000) {
      next.monthly_price = 'Price must be a whole number from 0 to 1,000,000, or left blank.';
    }
  }
  const maxLeads = Number(values.max_leads);
  if (!Number.isInteger(maxLeads) || maxLeads < 5 || maxLeads > 20) {
    next.max_leads = 'Leads must be a whole number from 5 to 20.';
  }
  return next;
}

/** Cast a validated offer form to the API payload (integers, trimmed). */
export function toOfferPayload(values: OfferValues): ValidOffer {
  const payload: ValidOffer = {
    offer: values.offer.trim(),
    city: values.city.trim(),
    max_leads: parseInt(values.max_leads, 10),
  };
  const priceRaw = values.monthly_price.trim();
  if (priceRaw !== '') {
    payload.monthly_price = parseInt(priceRaw, 10);
  }
  return payload;
}
