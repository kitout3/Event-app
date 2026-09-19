(() => {
  // Only the historical Pages URL needs the repository prefix.
  if (window.location.hostname !== 'kitout3.github.io') return;
  const APP_PATH = "/mariage-app/";

  function normalizeUrl(input) {
    if (input == null) return input;
    try {
      const url = new URL(String(input), window.location.href);
      if (url.origin !== window.location.origin) return input;

      if (url.pathname === "/mariage-app") {
        url.pathname = APP_PATH;
      }

      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return input;
    }
  }

  if (window.location.pathname === "/mariage-app") {
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
