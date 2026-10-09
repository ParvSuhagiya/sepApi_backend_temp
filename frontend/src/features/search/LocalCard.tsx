import { Phone, Store } from 'lucide-react';
import type { SearchInput } from '../../api/client';
import type { PlaceResult } from '../../api/schemas';
import { useOptionalSearchSession } from './session';
import { OutreachButton } from './OutreachButton';

function Stars({ rating }: { rating: number }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span role="img" aria-label={`Rated ${rating} out of 5 stars`} className="text-amber-500 font-bold">
      {'★'.repeat(full)}
      <span aria-hidden="true" className="text-muted/40">
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
      className="flex flex-col gap-3 rounded-3xl border border-line/80 bg-raised/90 p-5 sm:p-6 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4
            id={`local-${place.name}-heading`}
            className="break-words text-base sm:text-lg font-bold text-ink flex items-center gap-2"
          >
            <Store className="h-4 w-4 text-brand shrink-0" />
            <span>{place.name}</span>
          </h4>
          <p className="mt-1 break-words text-xs sm:text-sm text-muted">
            {[place.type, place.address].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
        {place.rating != null ? (
          <p className="flex items-center gap-1.5 text-ink">
            <Stars rating={place.rating} />
            <span className="text-muted font-medium">({place.reviews ?? 0} reviews)</span>
          </p>
        ) : (
          <p className="text-muted text-xs">Not rated yet</p>
        )}
      </div>

      {place.phone ? (
        <p className="text-xs sm:text-sm">
          <a
            href={`tel:${place.phone.replace(/\D/g, '')}`}
            className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>{place.phone}</span>
          </a>
        </p>
      ) : null}

      {profile ? (
        <div className="border-t border-line/60 pt-3">
          <OutreachButton profile={profile} place={place} />
        </div>
      ) : null}
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
    return (
      <div className="rounded-2xl border border-dashed border-line/80 bg-surface/40 p-6 text-center text-sm text-muted">
        No nearby businesses found for this search.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {places.map((place, index) => (
        <LocalCard key={`${place.name}|${index}`} place={place} profile={profile} />
      ))}
    </div>
  );
}
