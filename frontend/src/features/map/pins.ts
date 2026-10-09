import type { JobResult, PlaceResult } from '../../api/schemas';

export type PinKind = 'job' | 'place';
export type PinRisk = 'Low' | 'Medium' | 'High';

export interface MapPin {
  id: string;
  kind: PinKind;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  risk: PinRisk;
  salary: string | null;
  link: string | null;
  approximate: boolean;
}

function pinRisk(risk: JobResult['risk']): PinRisk {
  return risk === 'High' || risk === 'Medium' ? risk : 'Low';
}

function coordsOf(lat: unknown, lng: unknown): [number, number] | null {
  return typeof lat === 'number' && typeof lng === 'number' ? [lat, lng] : null;
}

/**
 * Build map pins from jobs and places. Only items with numeric
 * coordinates become pins; remote or unresolved items are skipped.
 */
export function buildPins(jobs: JobResult[], places: PlaceResult[]): MapPin[] {
  const pins: MapPin[] = [];
  jobs.forEach((job, index) => {
    const coords = coordsOf(job.lat, job.lng);
    if (!coords) return;
    pins.push({
      id: `job-${index}`,
      kind: 'job',
      lat: coords[0],
      lng: coords[1],
      title: job.title,
      subtitle: [job.company, job.location].filter(Boolean).join(' · '),
      risk: pinRisk(job.risk),
      salary: job.salary?.trim() ? job.salary : null,
      link: job.link ?? null,
      approximate: job.geo_precision === 'city' || job.geo_precision === 'approximate',
    });
  });
  places.forEach((place, index) => {
    const coords = coordsOf(place.lat, place.lng);
    if (!coords) return;
    pins.push({
      id: `place-${index}`,
      kind: 'place',
      lat: coords[0],
      lng: coords[1],
      title: place.name,
      subtitle: [place.type, place.address].filter(Boolean).join(' · '),
      risk: 'Low',
      salary: null,
      link: null,
      approximate: false,
    });
  });
  return pins;
}

/** IDs of pins selectable from the job list (jobs only, for now). */
export function jobPinIds(pins: MapPin[]): Set<string> {
  return new Set(pins.filter((pin) => pin.kind === 'job').map((pin) => pin.id));
}
