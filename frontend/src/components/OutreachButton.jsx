import { useState } from "react";
import { outreach } from "../api.js";
import { waLink } from "../lib/whatsapp.js";

export default function OutreachButton({ profile, place }) {
  const [state, setState] = useState("idle"); // idle | drafting | drafted | error
  const [draft, setDraft] = useState("");
  const [safetyNote, setSafetyNote] = useState("");

  if (!place.phone) return null;

  const link = state === "drafted" ? waLink(place.phone, draft) : null;

  async function handleDraft() {
    setState("drafting");
    try {
      const result = await outreach(profile, {
        name: place.name,
        type: place.type,
        address: place.address,
        rating: place.rating,
      });
      setDraft(result.message);
      setSafetyNote(result.safety_note || "");
      setState("drafted");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-2">
      {state === "idle" && (
        <button
          type="button"
          onClick={handleDraft}
          className="min-h-[40px] rounded-md border border-green-700 px-3 py-1 text-sm font-semibold text-green-800 focus:outline-none focus:ring-2 focus:ring-green-700"
        >
          Draft WhatsApp message
        </button>
      )}
      {state === "drafting" && <p className="text-sm text-slate-600">Drafting…</p>}
      {state === "error" && (
        <div>
          <p className="text-sm text-red-700">Could not draft message.</p>
          <button
            type="button"
            onClick={handleDraft}
            className="mt-1 min-h-[40px] rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-700"
          >
            Retry
          </button>
        </div>
      )}
      {state === "drafted" && (
        <div>
          <label htmlFor={`draft-${place.name}`} className="block text-sm font-medium text-slate-700">
            Draft message (edit before sending)
          </label>
          <textarea
            id={`draft-${place.name}`}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {safetyNote && <p className="mt-1 text-xs text-slate-500">{safetyNote}</p>}
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block min-h-[40px] rounded-md bg-green-700 px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
            >
              Review, then open in WhatsApp
            </a>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              This phone number cannot be opened in WhatsApp.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
