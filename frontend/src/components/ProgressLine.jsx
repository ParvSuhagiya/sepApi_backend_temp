import { useEffect, useState } from "react";

const DEFAULT_MESSAGES = [
  "Planning the best searches for you…",
  "Checking live jobs near you…",
  "Scanning local businesses…",
  "Reading demand trends…",
  "Asking around forums…",
  "Ranking your opportunities…",
];

export default function ProgressLine({ messages = DEFAULT_MESSAGES }) {
  const [index, setIndex] = useState(0);
  const list = messages.length > 0 ? messages : DEFAULT_MESSAGES;

  useEffect(() => {
    if (index >= list.length - 1) return undefined;
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, list.length - 1)), 3500);
    return () => clearTimeout(timer);
  }, [index, list.length]);

  return (
    <div aria-live="polite" className="mt-4 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-green-700 border-t-transparent motion-reduce:animate-none"
      />
      <p className="text-sm text-slate-700">{list[index]}</p>
    </div>
  );
}
