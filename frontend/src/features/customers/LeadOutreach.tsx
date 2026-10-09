import { useState } from 'react';
import { useOutreach } from '../../api/hooks';
import type { Lead } from '../../api/schemas';
import { waLink } from '../../lib/whatsapp';
import { Button } from '../../components/ui/Button';
import { CopyButton } from '../../components/ui/CopyButton';

interface LeadOutreachProps {
  lead: Lead;
  /** Owner's original offer text (builds the required synthetic profile). */
  offerText: string;
  /** Owner's city (builds the required synthetic profile). */
  city: string;
  /** What we understood (offer_summary, truncated to the 200-char limit). */
  productSummary: string;
}

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return text.trim() === '' ? 0 : words.length;
}

/**
 * WhatsApp draft flow for a customer lead. Idle -> drafting -> drafted ->
 * error. The draft is editable, never auto-sent. Only name/type/address/
 * rating plus product_summary reach the backend (never the phone); the
 * profile is synthesized from the owner's offer solely to satisfy the
 * shared outreach envelope.
 */
export function LeadOutreach({ lead, offerText, city, productSummary }: LeadOutreachProps) {
  const outreach = useOutreach();
  const [draft, setDraft] = useState('');
  const [safetyNote, setSafetyNote] = useState('');

  if (!lead.phone) return null;

  function startDraft() {
    outreach.mutate(
      {
        profile: {
          skills: offerText.trim().slice(0, 300),
          city,
          hours: 10,
          budget: 0,
        },
        target: {
          name: lead.name,
          type: lead.business_type ?? undefined,
          address: lead.address ?? undefined,
          rating: lead.rating ?? undefined,
          product_summary: productSummary.trim().slice(0, 200),
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
    const link = waLink(lead.phone, draft);
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={`lead-outreach-draft-${lead.name}`} className="text-sm font-medium text-ink">
          Draft message (edit before sending)
        </label>
        <textarea
          id={`lead-outreach-draft-${lead.name}`}
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
