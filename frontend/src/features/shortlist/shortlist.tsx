import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

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

/**
 * In-memory shortlist shared across modes. Nothing is persisted: no
 * localStorage, no uploads — closing the tab clears everything.
 */
export function ShortlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ShortlistItem[]>([]);

  const toggle = useCallback((draft: ShortlistDraft) => {
    setItems((prev) =>
      prev.some((item) => item.id === draft.id)
        ? prev.filter((item) => item.id !== draft.id)
        : [...prev, { ...draft, note: '' }],
    );
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

/** Star toggle for a lead, job or opportunity. Hidden without a provider. */
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
      className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-raised px-3 text-sm font-semibold text-ink hover:bg-surface"
    >
      <span aria-hidden="true">{starred ? '★' : '☆'}</span>&nbsp;{starred ? 'Saved' : 'Save'}
    </button>
  );
}
