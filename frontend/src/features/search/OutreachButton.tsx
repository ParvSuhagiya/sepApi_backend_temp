import { useState } from 'react';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
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
          try {
            confetti({
              particleCount: 20,
              spread: 45,
              origin: { y: 0.7 },
              colors: ['#22c55e', '#6366f1'],
              disableForReducedMotion: true,
            });
          } catch {
            // Ignore
          }
        },
      },
    );
  }

  if (outreach.isError) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-tone-red-border/30 bg-tone-red-bg/10 p-3">
        <p role="alert" className="text-xs font-semibold text-tone-red-fg">
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
        Drafting WhatsApp message…
      </Button>
    );
  }

  if (outreach.isSuccess) {
    const words = wordCount(draft);
    const link = waLink(place.phone, draft);
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 animate-reveal">
        <div className="flex items-center justify-between">
          <label htmlFor={`outreach-draft-${place.name}`} className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Draft message for {place.name} (edit before sending)</span>
          </label>
          <span className={`text-[11px] font-bold tabular-nums ${words > 70 ? 'text-tone-red-fg' : 'text-muted'}`}>
            {words}/70 words target
          </span>
        </div>
        <textarea
          id={`outreach-draft-${place.name}`}
          rows={4}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full rounded-xl border border-line/80 bg-raised px-3 py-2 text-xs sm:text-sm text-ink leading-relaxed shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
        {safetyNote ? <p className="text-[11px] text-muted leading-relaxed">🔒 {safetyNote}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={draft} label="draft message" />
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-lg transition-all"
            >
              <Send className="h-4 w-4" />
              <span>Review, then open in WhatsApp</span>
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          ) : (
            <p className="text-xs text-muted">
              This phone number can&apos;t be opened in WhatsApp.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Button variant="secondary" onClick={startDraft}>
      <MessageSquare className="h-4 w-4 text-brand" />
      <span>Draft WhatsApp message</span>
    </Button>
  );
}
