import { useEffect, useState } from 'react';

/** Offline banner: announces connectivity loss without blocking the app. */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );

  useEffect(() => {
    const goOffline = () => setOnline(false);
    const goOnline = () => setOnline(true);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (online) return null;
  return (
    <p
      role="status"
      className="border-b border-tone-amber-border bg-tone-amber-bg px-4 py-2 text-center text-sm font-semibold text-tone-amber-fg"
    >
      You are offline. Saved results stay visible; new searches need a connection.
    </p>
  );
}
