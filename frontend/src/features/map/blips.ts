import type { LeadsResponse, SearchResponse } from '../../api/schemas';
import type { RadarBlip, RadarTone } from '../../components/RadarScope';

function hashTitle(title: string): number {
  let hash = 0;
  for (let index = 0; index < title.length; index += 1) {
    hash = (hash * 31 + title.charCodeAt(index)) % 997;
  }
  return hash;
}

function positionFor(title: string, slot: number): { x: number; y: number } {
  const hash = hashTitle(`${slot}:${title}`);
  return { x: 18 + (hash % 64), y: 16 + ((hash >> 3) % 68) };
}

/**
 * Deterministic radar blips from live income results: top opportunities by
 * EarnScore (fit), rated local businesses (safe), high-risk jobs (risk).
 * Stable across renders for the same result set.
 */
export function searchBlips(result: SearchResponse): RadarBlip[] {
  const blips: RadarBlip[] = [];
  result.opportunities.slice(0, 4).forEach((opportunity, index) => {
    blips.push({
      ...positionFor(opportunity.title, index),
      tone: 'fit',
      label: opportunity.title,
      sub: `EarnScore ${opportunity.earn_score}`,
    });
  });
  result.local
    .filter((place) => (place.rating ?? 0) >= 4)
    .slice(0, 3)
    .forEach((place, index) => {
      blips.push({
        ...positionFor(place.name, index + 11),
        tone: 'safe',
        label: place.name,
        sub: place.rating != null ? `Rated ${place.rating}` : undefined,
      });
    });
  result.jobs
    .filter((job) => job.risk === 'High')
    .slice(0, 2)
    .forEach((job, index) => {
      blips.push({
        ...positionFor(job.title, index + 23),
        tone: 'risk',
        label: job.title,
        sub: 'High risk — verify before paying',
      });
    });
  return blips;
}

/** Deterministic blips from live customer leads, toned by match score. */
export function leadsBlips(result: LeadsResponse): RadarBlip[] {
  return result.leads.slice(0, 8).map((lead, index) => {
    const tone: RadarTone = lead.likely_has_software ? 'safe' : 'fit';
    return {
      ...positionFor(lead.name, index + 37),
      tone,
      label: lead.name,
      sub: `Lead score ${lead.match_score}`,
    };
  });
}
