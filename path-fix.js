(() => {
  // GitHub Pages project sites need a trailing slash after the repository
  // segment. Derive that segment from this script URL so repository renames do
  // not leave a stale hard-coded path behind.
  if (window.location.hostname !== 'kitout3.github.io') return;
  const scriptUrl = new URL(document.currentScript?.src || window.location.href);
  const APP_PATH = scriptUrl.pathname.replace(/[^/]*$/, "");
  const APP_PATH_WITHOUT_SLASH = APP_PATH.replace(/\/$/, "");
  if (!APP_PATH_WITHOUT_SLASH) return;

  function normalizeUrl(input) {
    if (input == null) return input;
    try {
      const url = new URL(String(input), window.location.href);
      if (url.origin !== window.location.origin) return input;

      if (url.pathname === APP_PATH_WITHOUT_SLASH) {
        url.pathname = APP_PATH;
      }

      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return input;
    }
  }

  if (window.location.pathname === APP_PATH_WITHOUT_SLASH) {
    const corrected = `${APP_PATH}${window.location.search}${window.location.hash}`;
    window.location.replace(corrected);
    return;
  }

  const originalReplaceState = history.replaceState.bind(history);
  const originalPushState = history.pushState.bind(history);

  history.replaceState = (state, unused, url) =>
    originalReplaceState(state, unused, normalizeUrl(url));

  history.pushState = (state, unused, url) =>
    originalPushState(state, unused, normalizeUrl(url));

  document.addEventListener("click", event => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const normalized = normalizeUrl(link.getAttribute("href"));
    if (normalized !== link.getAttribute("href")) link.setAttribute("href", normalized);
  }, true);
})();
