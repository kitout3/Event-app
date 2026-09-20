(() => {
  const LANG_KEY = "mariage-lang";
  const SUCCESS_SCREEN_ID = "vt-success-screen";
  const RETURN_DELAY_MS = 2400;

  const messages = {
    fr: "Votre témoignage a bien été envoyé",
    en: "Your video message has been sent",
    vi: "Lời chúc video của bạn đã được gửi"
  };

  const uploadSuccessMessages = new Set([
    "Merci ! Votre témoignage a bien été envoyé.",
    "Thank you! Your video has been uploaded.",
    "Cảm ơn! Video của bạn đã được gửi.",
    "Danke! Ihr Video wurde hochgeladen."
  ]);

  const currentMessage = () => window.EventI18n?.translate(messages.fr) || messages[localStorage.getItem(LANG_KEY)] || messages.fr;

  const reopenVideoSelection = () => {
    document.getElementById(SUCCESS_SCREEN_ID)?.remove();
    document.getElementById("vt-overlay")?.remove();
    history.replaceState(null, "", `${location.pathname}${location.search}#video`);

    const marker = document.createElement("span");
    marker.hidden = true;
    document.body.appendChild(marker);
    marker.remove();
  };

  const showSuccessScreen = () => {
    if (document.getElementById(SUCCESS_SCREEN_ID)) return;

    const screen = document.createElement("section");
    screen.id = SUCCESS_SCREEN_ID;
    screen.className = "vt-success-screen";
    screen.setAttribute("role", "status");
    screen.setAttribute("aria-live", "assertive");
    screen.innerHTML = `
      <div class="vt-success-content">
        <div class="vt-success-check" aria-hidden="true">✓</div>
        <p>${currentMessage()}</p>
      </div>
    `;
    document.body.appendChild(screen);

    window.setTimeout(reopenVideoSelection, RETURN_DELAY_MS);
  };

  const inspectStatus = () => {
    const status = document.querySelector("#vt-overlay [data-status]");
    if (!status) return;
    if (uploadSuccessMessages.has(status.textContent.trim())) showSuccessScreen();
  };

  const observer = new MutationObserver(inspectStatus);

  const start = () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    inspectStatus();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
