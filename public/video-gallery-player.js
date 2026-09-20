(() => {
  const PLAYER_ID = "vt-gallery-player";
  const GALLERY_SELECTOR = "#vt-overlay .vt-gallery-item";
  const VIDEO_SELECTOR = `${GALLERY_SELECTOR} video[src]`;

  const LABELS = {
    fr: { close: "Fermer", previous: "Vidéo précédente", next: "Vidéo suivante", video: "Vidéo" },
    en: { close: "Close", previous: "Previous video", next: "Next video", video: "Video" },
    vi: { close: "Đóng", previous: "Video trước", next: "Video tiếp theo", video: "Video" }
  };

  const getLang = () => {
    const value = localStorage.getItem("mariage-lang");
    return Object.prototype.hasOwnProperty.call(LABELS, value) ? value : "fr";
  };

  const getGalleryVideos = () => [...document.querySelectorAll(VIDEO_SELECTOR)]
    .map((video) => video.currentSrc || video.getAttribute("src") || "")
    .filter(Boolean);

  const closePlayer = () => {
    const player = document.getElementById(PLAYER_ID);
    if (!player) return;
    const video = player.querySelector("video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    player.remove();
  };

  const openPlayer = (startIndex = 0) => {
    const items = getGalleryVideos();
    if (!items.length) return;

    closePlayer();

    const labels = window.EventI18n?.dictionary(LABELS.fr) || LABELS[getLang()];
    let index = Math.min(Math.max(startIndex, 0), items.length - 1);
    const player = document.createElement("div");
    player.id = PLAYER_ID;
    player.className = "vt-gallery-player";
    player.setAttribute("role", "dialog");
    player.setAttribute("aria-modal", "true");
    player.setAttribute("aria-label", labels.video);
    player.innerHTML = `
      <div class="vt-gallery-player__stage">
        <video controls autoplay playsinline></video>
        <button class="vt-gallery-player__control vt-gallery-player__previous" type="button" data-gallery-previous aria-label="${labels.previous}">‹</button>
        <button class="vt-gallery-player__control vt-gallery-player__next" type="button" data-gallery-next aria-label="${labels.next}">›</button>
        <button class="vt-gallery-player__control vt-gallery-player__close" type="button" data-gallery-close aria-label="${labels.close}">✕</button>
        <div class="vt-gallery-player__counter" aria-live="polite" data-gallery-counter></div>
      </div>
    `;
    document.body.appendChild(player);

    const video = player.querySelector("video");
    const counter = player.querySelector("[data-gallery-counter]");
    const previousButton = player.querySelector("[data-gallery-previous]");
    const nextButton = player.querySelector("[data-gallery-next]");
    const closeButton = player.querySelector("[data-gallery-close]");

    const render = () => {
      const currentUrl = items[index];
      video.pause();
      video.src = currentUrl;
      video.load();
      counter.textContent = `${index + 1} / ${items.length}`;
      video.play().catch(() => {});
    };

    const move = (delta) => {
      index = (index + delta + items.length) % items.length;
      render();
    };

    const onKeyDown = (event) => {
      if (!document.getElementById(PLAYER_ID)) {
        document.removeEventListener("keydown", onKeyDown);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closePlayer();
        document.removeEventListener("keydown", onKeyDown);
      }
    };

    previousButton.addEventListener("click", () => move(-1));
    nextButton.addEventListener("click", () => move(1));
    closeButton.addEventListener("click", () => {
      closePlayer();
      document.removeEventListener("keydown", onKeyDown);
    });
    video.addEventListener("ended", () => move(1));
    player.addEventListener("click", (event) => {
      if (event.target === player) {
        closePlayer();
        document.removeEventListener("keydown", onKeyDown);
      }
    });
    document.addEventListener("keydown", onKeyDown);

    render();
    closeButton.focus();
  };

  const enhanceGalleryCards = () => {
    const cards = [...document.querySelectorAll(GALLERY_SELECTOR)];
    cards.forEach((card, index) => {
      if (card.dataset.galleryPlayerReady === "1") return;
      card.dataset.galleryPlayerReady = "1";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `${LABELS[getLang()].video} ${index + 1}`);
      const video = card.querySelector("video");
      if (video) video.controls = false;
    });
  };

  document.addEventListener("click", (event) => {
    if (event.target.closest(".ms-bar, .ms-select")) return;
    const card = event.target.closest(GALLERY_SELECTOR);
    if (card) {
      if (event.target.closest("button, a, input, select, textarea, [role='checkbox']")) return;
      const cards = [...document.querySelectorAll(GALLERY_SELECTOR)];
      const index = cards.indexOf(card);
      if (index >= 0) {
        event.preventDefault();
        event.stopPropagation();
        openPlayer(index);
      }
      return;
    }

    const playAll = event.target.closest("#vt-overlay .vt-overlay-actions [data-all]");
    if (playAll) {
      event.preventDefault();
      event.stopPropagation();
      openPlayer(0);
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.target.closest?.(".ms-bar, .ms-select, button, a, input, select, textarea, video, [role='checkbox']")) return;
    const card = event.target.closest?.(GALLERY_SELECTOR);
    if (!card || (event.key !== "Enter" && event.key !== " ")) return;
    const cards = [...document.querySelectorAll(GALLERY_SELECTOR)];
    const index = cards.indexOf(card);
    if (index < 0) return;
    event.preventDefault();
    openPlayer(index);
  });

  const observer = new MutationObserver(enhanceGalleryCards);
  const start = () => {
    enhanceGalleryCards();
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  window.addEventListener("load", enhanceGalleryCards);
})();
