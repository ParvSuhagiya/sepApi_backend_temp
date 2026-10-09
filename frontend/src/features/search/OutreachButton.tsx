import { useState } from 'react';
import { useOutreach } from '../../api/hooks';
import type { SearchInput } from '../../api/client';
import { waLink } from '../../lib/whatsapp';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';

export interface OutreachPlace {
  name: string;
  type?: string | null;
  address?: string | null;
  rating?: number | null;
  phone?: string | null;
}

interface OutreachButtonProps {
  profile: SearchInput;
  place: OutreachPlace;
}

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return text.trim() === '' ? 0 : words.length;
}

/**
 * WhatsApp draft flow. Idle -> drafting -> drafted -> error. The draft is
 * editable, never auto-sent; only name/type/address/rating reach the backend.
 */
export function OutreachButton({ profile, place }: OutreachButtonProps) {
  const outreach = useOutreach();
  const [draft, setDraft] = useState('');
  const [safetyNote, setSafetyNote] = useState('');

  if (!place.phone) return null;

  function startDraft() {
    outreach.mutate(
      {
        profile,
        target: {
          name: place.name,
          type: place.type ?? undefined,
          address: place.address ?? undefined,
          rating: place.rating ?? undefined,
        },
      },
      {
        onSuccess: (data) => {
          setDraft(data.message);
          setSafetyNote(data.safety_note);
        },
      },
    );
  }

  if (outreach.isError) {
    return (
      <div className="flex flex-col gap-2">
        <p role="alert" className="text-sm text-ink">
          Could not draft message.
        </p>
        <div>
          <Button variant="secondary" onClick={startDraft}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (outreach.isPending) {
    return (
      <Button variant="secondary" loading>
        Drafting message…
      </Button>
    );
  }

  if (outreach.isSuccess) {
    const words = wordCount(draft);
    const link = waLink(place.phone, draft);
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={`outreach-draft-${place.name}`} className="text-sm font-medium text-ink">
          Draft message (edit before sending)
        </label>
        <textarea
          id={`outreach-draft-${place.name}`}
          rows={4}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-ink"
        />
        <p className={`text-xs ${words > 70 ? 'font-semibold text-tone-red-fg' : 'text-muted'}`}>
          {words}/70 words target
        </p>
        {safetyNote ? <p className="text-xs text-muted">{safetyNote}</p> : null}
        <div className="flex flex-wrap gap-2">
          <CopyButton text={draft} label="draft message" />
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-md bg-brand-strong px-4 text-sm font-semibold text-white hover:brightness-110"
            >
              Review, then open in WhatsApp
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          ) : (
            <p className="text-sm text-muted">
              This phone number can&apos;t be opened in WhatsApp.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Button variant="secondary" onClick={startDraft}>
      Draft WhatsApp message
    </Button>
  );
}
