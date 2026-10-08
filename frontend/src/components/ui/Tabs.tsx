import { useRef } from 'react';

interface TabsProps {
  tabs: ReadonlyArray<{ id: string; label: string }>;
  activeId: string;
  onChange: (id: string) => void;
  label: string;
}

/** Accessible tabs with roving tabindex and full arrow-key support. */
export function Tabs({ tabs, activeId, onChange, label }: TabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTab(index: number) {
    const wrapped = (index + tabs.length) % tabs.length;
    const tab = tabs[wrapped];
    if (!tab) return;
    onChange(tab.id);
    refs.current[wrapped]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  }

  return (
    <div role="tablist" aria-label={label} className="flex gap-2">
      {tabs.map((tab, index) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`min-h-[44px] flex-1 rounded-md px-4 py-2 text-sm font-semibold sm:flex-none ${
              selected
                ? 'brand-gradient text-white shadow-md'
                : 'border border-line bg-raised text-ink hover:bg-surface'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
