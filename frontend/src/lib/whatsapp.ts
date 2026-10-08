/**
 * Build a wa.me link for a phone number, or null when unusable.
 * 10-digit numbers get the 91 (India) prefix; 12-digit numbers starting
 * with 91 are kept; leading zeros are stripped. Anything else -> null.
 *
 * Ported verbatim from the previous frontend (behavior pinned by tests).
 */
export function waLink(phone: string | number | null | undefined, text?: string): string | null {
  if (typeof phone !== 'string' && typeof phone !== 'number') return null;
  const digits = String(phone)
    .replace(/\D/g, '')
    .replace(/^0+/, '');
  let number: string | null = null;
  if (/^\d{10}$/.test(digits)) {
    number = `91${digits}`;
  } else if (/^91\d{10}$/.test(digits)) {
    number = digits;
  } else {
    return null;
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(String(text ?? ''))}`;
}
