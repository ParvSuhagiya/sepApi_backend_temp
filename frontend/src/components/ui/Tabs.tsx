import { useRef } from 'react';
import { motion } from 'framer-motion';

interface TabsProps {
  tabs: ReadonlyArray<{ id: string; label: string }>;
  activeId: string;
  onChange: (id: string) => void;
  label: string;
}

/** Accessible tabs with roving tabindex, full arrow-key support, and fluid Framer Motion indicator. */
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
    <div
      role="tablist"
      aria-label={label}
      className="relative flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl border border-line/80 bg-raised/90 p-1 shadow-sm backdrop-blur-md"
    >
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
            className={`relative z-10 min-h-[40px] shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 sm:flex-none ${
              selected ? 'text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {selected && (
              <motion.div
                layoutId="active-tab-indicator"
                className="brand-gradient absolute inset-0 -z-10 rounded-lg shadow-md"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
