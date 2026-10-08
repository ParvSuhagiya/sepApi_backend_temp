/* Theme bootstrap: runs synchronously before first paint so the correct
   theme applies with no flash. Classic script (allowed by CSP: script-src
   'self'). Must stay in sync with the theme storage key in app code. */
(function () {
  try {
    var stored = window.localStorage.getItem('earnrader-theme');
    var mode = stored === 'light' || stored === 'dark' ? stored : 'system';
    var theme =
      mode === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : mode;
    document.documentElement.dataset.theme = theme;
  } catch {
    /* Storage unavailable (private mode): leave the default light theme. */
  }
})();
