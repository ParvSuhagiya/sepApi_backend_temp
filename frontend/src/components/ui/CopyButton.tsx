import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copy-to-clipboard button with confirmation. Label must say what is copied. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : `Copy ${label}`}
      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md border border-line bg-raised px-2 text-sm font-semibold text-ink hover:bg-surface"
    >
      {copied ? (
        <Check aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Copy aria-hidden="true" className="h-4 w-4" />
      )}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}
