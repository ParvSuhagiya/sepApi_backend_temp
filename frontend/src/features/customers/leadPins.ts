import type { Lead } from '../../api/schemas';
import { leadPinSize } from './leadUtils';

export interface LeadPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  score: number;
  size: number;
  shortlisted: boolean;
}

function coordsOf(lat: unknown, lng: unknown): [number, number] | null {
  return typeof lat === 'number' && typeof lng === 'number' ? [lat, lng] : null;
}

/**
 * Build map pins from leads. Only leads with numeric coordinates become
 * pins; the backend rarely sends coordinates, so callers must handle the
 * empty case with a compact notice instead of a broken map.
 */
export function buildLeadPins(
  leads: Lead[],
  shortlistedIds?: ReadonlySet<string>,
): LeadPin[] {
  const pins: LeadPin[] = [];
  leads.forEach((lead, index) => {
    const coords = coordsOf(lead.lat, lead.lng);
    if (!coords) return;
    const id = `lead-${index}`;
    pins.push({
      id,
      lat: coords[0],
      lng: coords[1],
      title: lead.name,
      subtitle: [lead.business_type, lead.address].filter(Boolean).join(' · '),
      score: lead.match_score,
      size: leadPinSize(lead.match_score),
      shortlisted: shortlistedIds?.has(id) ?? false,
    });
  });
  return pins;
}
