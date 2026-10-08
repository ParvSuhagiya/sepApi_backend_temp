import { useRef } from "react";

const TABS = [
  { id: "income", label: "Find income ideas" },
  { id: "customers", label: "Find customers for my product" },
];

export default function ModeSwitch({ mode, onChange }) {
  const refs = useRef([]);

  function focusTab(index) {
    const wrapped = (index + TABS.length) % TABS.length;
    onChange(TABS[wrapped].id);
    refs.current[wrapped]?.focus();
  }

  function handleKeyDown(event, index) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(TABS.length - 1);
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Choose what EarnRadar finds for you"
      className="flex gap-2"
    >
      {TABS.map((tab, index) => {
        const selected = mode === tab.id;
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
            className={`min-h-[40px] flex-1 rounded-md px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 sm:flex-none ${
              selected
                ? "bg-green-700 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
