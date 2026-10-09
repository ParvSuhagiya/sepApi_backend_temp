import type { SearchInput } from '../../api/client';
import type { PlaceResult } from '../../api/schemas';
import { useOptionalSearchSession } from './session';
import { OutreachButton } from './OutreachButton';

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span role="img" aria-label={`Rated ${rating} out of 5 stars`} className="text-ink">
      {'★'.repeat(full)}
      <span aria-hidden="true" className="text-muted">
        {'☆'.repeat(5 - full)}
      </span>
    </span>
  );
}

/** One nearby business with an optional WhatsApp draft flow. */
export function LocalCard({
  place,
  profile,
}: {
  place: PlaceResult;
  profile: SearchInput | null;
}) {
  return (
    <article
      aria-labelledby={`local-${place.name}-heading`}
      className="flex flex-col gap-2 rounded-lg border border-line bg-raised p-4 shadow-sm"
    >
      <h4 id={`local-${place.name}-heading`} className="break-words text-base font-bold text-ink">
        {place.name}
      </h4>
      <p className="break-words text-sm text-muted">
        {[place.type, place.address].filter(Boolean).join(' · ')}
      </p>
      {place.rating != null ? (
        <p className="text-sm text-ink">
          <Stars rating={place.rating} />{' '}
          <span className="text-muted">({place.reviews ?? 0} reviews)</span>
        </p>
      ) : (
        <p className="text-sm text-muted">Not rated yet</p>
      )}
      {place.phone ? (
        <p className="text-sm">
          <a href={`tel:${place.phone.replace(/\D/g, '')}`} className="font-semibold text-brand underline">
            {place.phone}
          </a>
        </p>
      ) : null}
      {profile ? <OutreachButton profile={profile} place={place} /> : null}
    </article>
  );
}

/** Nearby businesses; outreach needs the submitted profile from the session. */
export function LocalList({
  places,
  profile: profileProp,
}: {
  places: PlaceResult[];
  profile?: SearchInput | null;
}) {
  const session = useOptionalSearchSession();
  const profile = profileProp !== undefined ? profileProp : (session?.profile ?? null);
  if (places.length === 0) {
    return <p className="text-sm text-muted">No nearby businesses found for this search.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {places.map((place, index) => (
        <LocalCard key={`${place.name}|${index}`} place={place} profile={profile} />
      ))}
    </div>
  );
}
