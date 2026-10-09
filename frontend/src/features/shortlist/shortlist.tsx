import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import confetti from 'canvas-confetti';
import { Star } from 'lucide-react';

export type ShortlistKind = 'lead' | 'job' | 'opportunity';

export interface ShortlistItem {
  id: string;
  kind: ShortlistKind;
  title: string;
  subtitle: string;
  phone: string | null;
  note: string;
}

export type ShortlistDraft = Omit<ShortlistItem, 'note'>;

interface ShortlistContextValue {
  items: ShortlistItem[];
  count: number;
  isStarred: (id: string) => boolean;
  toggle: (draft: ShortlistDraft) => void;
  setNote: (id: string, note: string) => void;
  clear: () => void;
}

const ShortlistContext = createContext<ShortlistContextValue | null>(null);

function triggerConfetti() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const canvas = document.createElement('canvas');
    if (!canvas.getContext || !canvas.getContext('2d')) return;
    confetti({
      particleCount: 25,
      spread: 50,
      origin: { y: 0.8 },
      colors: ['#6366f1', '#14b8a6', '#f59e0b'],
      disableForReducedMotion: true,
    });
  } catch {
    // Ignore
  }
}

/**
 * In-memory shortlist shared across modes. Nothing is persisted: no
 * localStorage, no uploads — closing the tab clears everything.
 */
export function ShortlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ShortlistItem[]>([]);

  const toggle = useCallback((draft: ShortlistDraft) => {
    setItems((prev) => {
      const exists = prev.some((item) => item.id === draft.id);
      if (!exists) {
        triggerConfetti();
        return [...prev, { ...draft, note: '' }];
      }
      return prev.filter((item) => item.id !== draft.id);
    });
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, note } : item)));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<ShortlistContextValue>(
    () => ({
      items,
      count: items.length,
      isStarred: (id: string) => items.some((item) => item.id === id),
      toggle,
      setNote,
      clear,
    }),
    [items, toggle, setNote, clear],
  );
  return <ShortlistContext.Provider value={value}>{children}</ShortlistContext.Provider>;
}

export function useShortlist(): ShortlistContextValue {
  const shortlist = useContext(ShortlistContext);
  if (!shortlist) throw new Error('useShortlist must be used inside ShortlistProvider');
  return shortlist;
}

/** Null outside the provider, so cards render cleanly without context. */
export function useOptionalShortlist(): ShortlistContextValue | null {
  return useContext(ShortlistContext);
}

/** Star toggle for a lead, job or opportunity with scale bounce & confetti delight. */
export function StarButton({ item }: { item: ShortlistDraft }) {
  const shortlist = useOptionalShortlist();
  if (!shortlist) return null;
  const starred = shortlist.isStarred(item.id);
  return (
    <button
      type="button"
      aria-pressed={starred}
      aria-label={
        starred ? `Remove ${item.title} from shortlist` : `Add ${item.title} to shortlist`
      }
      onClick={() => shortlist.toggle(item)}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold transition-all duration-150 active:scale-95 ${
        starred
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm'
          : 'border-line/80 bg-raised/80 text-muted hover:text-ink hover:bg-surface hover:border-brand/30'
      }`}
    >
      <Star
        className={`h-4 w-4 transition-transform ${
          starred ? 'fill-amber-500 text-amber-500 scale-110' : 'text-muted'
        }`}
      />
      <span>{starred ? 'Saved' : 'Save'}</span>
    </button>
  );
}
