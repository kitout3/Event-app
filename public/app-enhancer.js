(() => {
  const TENANT = window.__WEDDING_TENANT__ || {};
  const EVENT_ID = TENANT.eventId || "__unknown_wedding__";
  const EVENT_KEY = `mariage-event-settings:${EVENT_ID}`;
  const LANG_KEY = "mariage-lang";
  const IS_LEGACY = EVENT_ID === "quentin-huyen-2026";
  const DEFAULT_EVENT = {
    name: IS_LEGACY ? "Huyen & Quentin" : "Votre événement",
    date: IS_LEGACY ? "13 septembre 2026" : "",
    location: IS_LEGACY ? "La Faisanderie d’Arcueil" : "",
    coverMessage: IS_LEGACY ? "Partagez vos plus beaux souvenirs" : "Partagez vos meilleurs moments"
  };

  const translations = {
    fr: {
      "Envoyer une photo": "Envoyer une photo", "Partager un souvenir": "Partager un souvenir",
      "Galerie & réactions": "Galerie & réactions", "Voir toutes les photos": "Voir toutes les photos",
      "Affichage TV": "Affichage TV", "Diaporama plein écran": "Diaporama plein écran",
      "Administration": "Administration", "Modérer & exporter": "Modérer et exporter",
      "Regarder le live": "Regarder le live", "Suivre la cérémonie en direct": "Suivre la cérémonie en direct",
      "QR Code invités": "QR Code invités", "Copier le lien": "Copier le lien", "Connexion…": "Connexion…",
      "Retour à l'accueil": "Retour à l’accueil", "Retour à l’accueil": "Retour à l’accueil",
      "Votre prénom (optionnel)": "Votre prénom (optionnel)", "Un petit mot (optionnel)": "Un petit mot (optionnel)",
      "Choisir une photo": "Choisir une photo", "Prendre une photo": "Prendre une photo", "Envoyer": "Envoyer",
      "Annuler": "Annuler", "Réessayer": "Réessayer", "Merci !": "Merci !", "Photo envoyée": "Photo envoyée",
      "Voir la galerie": "Voir la galerie", "Toutes": "Toutes", "Publiées": "Publiées", "En attente": "En attente",
      "Refusées": "Refusées", "Aucune photo ici": "Aucune photo ici", "Photo mise à jour": "Photo mise à jour",
      "Supprimée": "Supprimée", "Photos": "Photos", "Stats": "Statistiques", "Paramètres": "Paramètres",
      "Export": "Export", "Événement": "Événement", "Nom des mariés": "Nom des mariés", "Date": "Date",
      "Message d'accueil": "Message d’accueil", "Mot de passe admin": "Mot de passe administrateur",
      "Modération": "Modération", "Immédiate": "Immédiate", "Photos visibles dès l'envoi": "Photos visibles dès l’envoi",
      "Modérée": "Modérée", "Validation manuelle": "Validation manuelle", "Différée": "Différée",
      "Affichage automatique après délai": "Affichage automatique après un délai", "Mur": "Mur", "Diapo": "Diaporama",
      "Mixte": "Mixte", "Sauvegarder": "Sauvegarder", "Paramètres sauvegardés": "Paramètres sauvegardés",
      "Mot de passe": "Mot de passe", "Se connecter": "Se connecter", "Mot de passe incorrect": "Mot de passe incorrect",
      "Déconnexion": "Déconnexion", "Déco.": "Déconnexion", "Accueil": "Accueil", "Total": "Total",
      "Réactions": "Réactions", "Photos par heure": "Photos par heure", "Aucune donnée": "Aucune donnée",
      "Photos les plus aimées": "Photos les plus aimées", "Télécharger le CSV": "Télécharger le CSV",
      "Télécharger les photos": "Télécharger les photos", "Exporter": "Exporter", "Dernière": "Dernière",
      "Photo la plus aimée": "Photo la plus aimée", "Cérémonie en direct": "Cérémonie en direct",
      "Le direct n’est pas encore configuré": "Le direct n’est pas encore configuré", "Ouvrir le lecteur": "Ouvrir le lecteur",
      "Diffusion en direct": "Diffusion en direct", "Lien YouTube du live": "Lien YouTube du live",
      "Sauvegarder le lien du live": "Sauvegarder le lien du live", "Lien YouTube invalide.": "Lien YouTube invalide.",
      "Sauvegarde en cours…": "Sauvegarde en cours…", "Lien sauvegardé dans Firebase.": "Lien sauvegardé dans Firebase."
    },
    en: {
      "Envoyer une photo": "Upload a photo", "Partager un souvenir": "Share a memory",
      "Galerie & réactions": "Gallery & reactions", "Voir toutes les photos": "View all photos",
      "Affichage TV": "TV display", "Diaporama plein écran": "Full-screen slideshow",
      "Administration": "Administration", "Modérer & exporter": "Moderate and export", "Modérer et exporter": "Moderate and export",
      "Regarder le live": "Watch live", "Suivre la cérémonie en direct": "Watch the ceremony live",
      "QR Code invités": "Guest QR code", "Copier le lien": "Copy link", "Connexion…": "Connecting…",
      "Retour à l'accueil": "Back to home", "Retour à l’accueil": "Back to home",
      "Votre prénom (optionnel)": "Your first name (optional)", "Un petit mot (optionnel)": "A short message (optional)",
      "Choisir une photo": "Choose a photo", "Prendre une photo": "Take a photo", "Envoyer": "Send",
      "Annuler": "Cancel", "Réessayer": "Try again", "Merci !": "Thank you!", "Photo envoyée": "Photo uploaded",
      "Voir la galerie": "View gallery", "Toutes": "All", "Publiées": "Published", "En attente": "Pending",
      "Refusées": "Rejected", "Aucune photo ici": "No photos here", "Photo mise à jour": "Photo updated",
      "Supprimée": "Deleted", "Photos": "Photos", "Stats": "Statistics", "Statistiques": "Statistics",
      "Paramètres": "Settings", "Export": "Export", "Événement": "Event", "Nom des mariés": "Couple’s names",
      "Date": "Date", "Message d'accueil": "Welcome message", "Message d’accueil": "Welcome message",
      "Mot de passe admin": "Admin password", "Mot de passe administrateur": "Admin password",
      "Modération": "Moderation", "Immédiate": "Immediate", "Photos visibles dès l'envoi": "Photos visible immediately after upload",
      "Photos visibles dès l’envoi": "Photos visible immediately after upload", "Modérée": "Moderated",
      "Validation manuelle": "Manual approval", "Différée": "Delayed",
      "Affichage automatique après délai": "Automatic display after a delay", "Affichage automatique après un délai": "Automatic display after a delay",
      "Mur": "Wall", "Diapo": "Slideshow", "Diaporama": "Slideshow", "Mixte": "Mixed", "Sauvegarder": "Save",
      "Paramètres sauvegardés": "Settings saved", "Mot de passe": "Password", "Se connecter": "Sign in",
      "Mot de passe incorrect": "Incorrect password", "Déconnexion": "Sign out", "Déco.": "Sign out", "Accueil": "Home",
      "Total": "Total", "Réactions": "Reactions", "Photos par heure": "Photos by hour", "Aucune donnée": "No data",
      "Photos les plus aimées": "Most liked photos", "Télécharger le CSV": "Download CSV",
      "Télécharger les photos": "Download photos", "Exporter": "Export", "Dernière": "Latest",
      "Photo la plus aimée": "Most liked photo", "Cérémonie en direct": "Live ceremony",
      "Le direct n’est pas encore configuré": "The live stream is not configured yet", "Ouvrir le lecteur": "Open player",
      "Diffusion en direct": "Live streaming", "Lien YouTube du live": "YouTube live link",
      "Sauvegarder le lien du live": "Save live link", "Lien YouTube invalide.": "Invalid YouTube link.",
      "Sauvegarde en cours…": "Saving…", "Lien sauvegardé dans Firebase.": "Link saved in Firebase."
    },
    vi: {
      "Envoyer une photo": "Gửi ảnh", "Partager un souvenir": "Chia sẻ kỷ niệm",
      "Galerie & réactions": "Thư viện ảnh và cảm xúc", "Voir toutes les photos": "Xem tất cả ảnh",
      "Affichage TV": "Màn hình trình chiếu", "Diaporama plein écran": "Trình chiếu toàn màn hình",
      "Administration": "Quản trị", "Modérer & exporter": "Kiểm duyệt và xuất dữ liệu", "Modérer et exporter": "Kiểm duyệt và xuất dữ liệu",
      "Regarder le live": "Xem trực tiếp", "Suivre la cérémonie en direct": "Theo dõi lễ cưới trực tiếp",
      "QR Code invités": "Mã QR dành cho khách", "Copier le lien": "Sao chép liên kết", "Connexion…": "Đang kết nối…",
      "Retour à l'accueil": "Về trang chủ", "Retour à l’accueil": "Về trang chủ",
      "Votre prénom (optionnel)": "Tên của bạn (không bắt buộc)", "Un petit mot (optionnel)": "Lời nhắn ngắn (không bắt buộc)",
      "Choisir une photo": "Chọn ảnh", "Prendre une photo": "Chụp ảnh", "Envoyer": "Gửi", "Annuler": "Hủy",
      "Réessayer": "Thử lại", "Merci !": "Cảm ơn!", "Photo envoyée": "Ảnh đã được gửi", "Voir la galerie": "Xem thư viện",
      "Toutes": "Tất cả", "Publiées": "Đã đăng", "En attente": "Đang chờ", "Refusées": "Đã từ chối",
      "Aucune photo ici": "Chưa có ảnh", "Photo mise à jour": "Ảnh đã được cập nhật", "Supprimée": "Đã xóa",
      "Photos": "Ảnh", "Stats": "Thống kê", "Statistiques": "Thống kê", "Paramètres": "Cài đặt",
      "Export": "Xuất dữ liệu", "Événement": "Sự kiện", "Nom des mariés": "Tên cô dâu và chú rể", "Date": "Ngày",
      "Message d'accueil": "Lời chào", "Message d’accueil": "Lời chào", "Mot de passe admin": "Mật khẩu quản trị",
      "Mot de passe administrateur": "Mật khẩu quản trị", "Modération": "Kiểm duyệt", "Immédiate": "Ngay lập tức",
      "Photos visibles dès l'envoi": "Ảnh hiển thị ngay sau khi gửi", "Photos visibles dès l’envoi": "Ảnh hiển thị ngay sau khi gửi",
      "Modérée": "Có kiểm duyệt", "Validation manuelle": "Duyệt thủ công", "Différée": "Trì hoãn",
      "Affichage automatique après délai": "Tự động hiển thị sau một khoảng thời gian", "Affichage automatique après un délai": "Tự động hiển thị sau một khoảng thời gian",
      "Mur": "Tường ảnh", "Diapo": "Trình chiếu", "Diaporama": "Trình chiếu", "Mixte": "Kết hợp",
      "Sauvegarder": "Lưu", "Paramètres sauvegardés": "Đã lưu cài đặt", "Mot de passe": "Mật khẩu",
      "Se connecter": "Đăng nhập", "Mot de passe incorrect": "Mật khẩu không đúng", "Déconnexion": "Đăng xuất",
      "Déco.": "Đăng xuất", "Accueil": "Trang chủ", "Total": "Tổng cộng", "Réactions": "Cảm xúc",
      "Photos par heure": "Ảnh theo giờ", "Aucune donnée": "Không có dữ liệu", "Photos les plus aimées": "Ảnh được yêu thích nhất",
      "Télécharger le CSV": "Tải tệp CSV", "Télécharger les photos": "Tải ảnh", "Exporter": "Xuất dữ liệu",
      "Dernière": "Mới nhất", "Photo la plus aimée": "Ảnh được yêu thích nhất", "Cérémonie en direct": "Lễ cưới trực tiếp",
      "Le direct n’est pas encore configuré": "Buổi phát trực tiếp chưa được cấu hình", "Ouvrir le lecteur": "Mở trình phát",
      "Diffusion en direct": "Phát trực tiếp", "Lien YouTube du live": "Liên kết YouTube trực tiếp",
      "Sauvegarder le lien du live": "Lưu liên kết trực tiếp", "Lien YouTube invalide.": "Liên kết YouTube không hợp lệ.",
      "Sauvegarde en cours…": "Đang lưu…", "Lien sauvegardé dans Firebase.": "Đã lưu liên kết vào Firebase."
    }
  };

  translations.de = {
    "Envoyer une photo":"Foto hochladen","Partager un souvenir":"Erinnerung teilen","Galerie & réactions":"Galerie & Reaktionen","Voir toutes les photos":"Alle Fotos ansehen",
    "Affichage TV":"TV-Anzeige","Diaporama plein écran":"Vollbild-Diashow","Administration":"Administration","Modérer & exporter":"Moderieren und exportieren","Modérer et exporter":"Moderieren und exportieren",
    "Regarder le live":"Live ansehen","Suivre la cérémonie en direct":"Zeremonie live verfolgen","QR Code invités":"Gäste-QR-Code","Copier le lien":"Link kopieren","Connexion…":"Verbindung…",
    "Retour à l'accueil":"Zurück zur Startseite","Retour à l’accueil":"Zurück zur Startseite","Votre prénom (optionnel)":"Ihr Vorname (optional)","Un petit mot (optionnel)":"Eine kurze Nachricht (optional)",
    "Choisir une photo":"Foto auswählen","Prendre une photo":"Foto aufnehmen","Envoyer":"Senden","Annuler":"Abbrechen","Réessayer":"Erneut versuchen","Merci !":"Danke!","Photo envoyée":"Foto hochgeladen",
    "Voir la galerie":"Galerie ansehen","Toutes":"Alle","Publiées":"Veröffentlicht","En attente":"Ausstehend","Refusées":"Abgelehnt","Aucune photo ici":"Keine Fotos vorhanden","Photo mise à jour":"Foto aktualisiert",
    "Supprimée":"Gelöscht","Photos":"Fotos","Stats":"Statistiken","Statistiques":"Statistiken","Paramètres":"Einstellungen","Export":"Export","Événement":"Veranstaltung","Nom des mariés":"Namen des Brautpaars",
    "Date":"Datum","Message d'accueil":"Willkommensnachricht","Message d’accueil":"Willkommensnachricht","Mot de passe admin":"Admin-Passwort","Mot de passe administrateur":"Admin-Passwort",
    "Modération":"Moderation","Immédiate":"Sofort","Photos visibles dès l'envoi":"Fotos sofort nach dem Upload sichtbar","Photos visibles dès l’envoi":"Fotos sofort nach dem Upload sichtbar",
    "Modérée":"Moderiert","Validation manuelle":"Manuelle Freigabe","Différée":"Verzögert","Affichage automatique après délai":"Automatische Anzeige nach einer Verzögerung","Affichage automatique après un délai":"Automatische Anzeige nach einer Verzögerung",
    "Mur":"Wand","Diapo":"Diashow","Diaporama":"Diashow","Mixte":"Gemischt","Sauvegarder":"Speichern","Paramètres sauvegardés":"Einstellungen gespeichert","Mot de passe":"Passwort","Se connecter":"Anmelden",
    "Mot de passe incorrect":"Falsches Passwort","Déconnexion":"Abmelden","Déco.":"Abmelden","Accueil":"Startseite","Total":"Gesamt","Réactions":"Reaktionen","Photos par heure":"Fotos pro Stunde","Aucune donnée":"Keine Daten",
    "Photos les plus aimées":"Beliebteste Fotos","Télécharger le CSV":"CSV herunterladen","Télécharger les photos":"Fotos herunterladen","Exporter":"Exportieren","Dernière":"Neueste","Photo la plus aimée":"Beliebtestes Foto"
  };

  const LANGUAGE_CODES = ["fr","en","vi","de"];
  const reverseTranslations = {};
  LANGUAGE_CODES.forEach(code => {
    reverseTranslations[code] = {};
    Object.entries(translations[code] || {}).forEach(([fr, translated]) => {
      reverseTranslations[code][translated] = fr;
    });
  });
  function canonicalFrench(text) {
    for (const code of LANGUAGE_CODES) {
      if (reverseTranslations[code]?.[text]) return reverseTranslations[code][text];
    }
    return text;
  }

  let currentLanguage = localStorage.getItem(LANG_KEY) || ((navigator.language || "fr").slice(0, 2));
  if (!translations[currentLanguage]) currentLanguage = "fr";

  function runtimeEvent() {
    const current = window.__WEDDING_EVENT__;
    if (current && (current.id === EVENT_ID || current.slug === EVENT_ID)) {
      return {
        name: current.name || DEFAULT_EVENT.name,
        date: current.date || DEFAULT_EVENT.date,
        location: current.location || DEFAULT_EVENT.location,
        coverMessage: current.coverMessage || DEFAULT_EVENT.coverMessage
      };
    }
    return null;
  }

  function readEvent() {
    const live = runtimeEvent();
    if (live) return live;
    try {
      const saved = JSON.parse(localStorage.getItem(EVENT_KEY) || "{}");
      return { ...DEFAULT_EVENT, ...saved };
    } catch {
      return { ...DEFAULT_EVENT };
    }
  }

  function saveEvent(patch) {
    const next = { ...readEvent(), ...patch };
    localStorage.setItem(EVENT_KEY, JSON.stringify(next));
    return next;
  }

  function applyEventIdentity(root = document.body) {
    if (!root) return;
    const event = readEvent();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.parentElement?.closest("#wedding-language-switcher,#wedding-live-panel")) return;
      const original = node.nodeValue;
      const trimmed = original.trim();
      let replacement = null;

      // Replace only complete legacy placeholders. Never replace a date fragment
      // inside the current event date, otherwise a MutationObserver refresh can
      // recursively turn "12 – 13 septembre 2026" into "12 – 12 – 13 ...".
      if (/^(Marie\s*&\s*Thomas|Quentin\s*&\s*Huyen)$/i.test(trimmed)) {
        replacement = event.name;
      } else if (/^(21\s*Juin\s*2025|13\s*Septembre\s*2026)$/i.test(trimmed)) {
        replacement = event.date;
      }

      if (replacement !== null) {
        const leading = original.match(/^\s*/)?.[0] || "";
        const trailing = original.match(/\s*$/)?.[0] || "";
        node.nodeValue = `${leading}${replacement}${trailing}`;
      }
    });
    document.title = `${event.name} — ${event.date}`;
  }

  function translatePage(root = document.body) {
    if (!root) return;
    const dictionary = translations[currentLanguage];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.parentElement?.closest("#wedding-language-switcher,#wedding-live-panel")) return;
      const clean = node.nodeValue.trim();
      const source = canonicalFrench(clean);
      if (dictionary[source] && dictionary[source] !== clean) node.nodeValue = node.nodeValue.replace(clean, dictionary[source]);
    });
    const placeholderMap = {
      fr: { "Mot de passe": "Mot de passe", "Votre prénom": "Votre prénom", "Votre message": "Votre message" },
      en: { "Mot de passe": "Password", "Votre prénom": "Your first name", "Votre message": "Your message" },
      vi: { "Mot de passe": "Mật khẩu", "Votre prénom": "Tên của bạn", "Votre message": "Lời nhắn của bạn" },
      de: { "Mot de passe": "Passwort", "Votre prénom": "Ihr Vorname", "Votre message": "Ihre Nachricht" }
    };
    root.querySelectorAll?.("input,textarea").forEach(input => {
      const placeholder = input.getAttribute("placeholder");
      if (!placeholder) return;
      for (const source of Object.keys(placeholderMap.fr)) {
        const variants = [placeholderMap.fr[source], placeholderMap.en[source], placeholderMap.vi[source], placeholderMap.de[source]];
        if (variants.includes(placeholder)) input.setAttribute("placeholder", placeholderMap[currentLanguage][source]);
      }
    });
    document.documentElement.lang = currentLanguage;
    updateLanguageButtons();
  }

  function updateLanguageButtons() {
    document.querySelectorAll("#wedding-language-switcher button").forEach(button => {
      const active = button.dataset.lang === currentLanguage;
      button.style.background = active ? "#5c2a1e" : "transparent";
      button.style.color = active ? "white" : "#5c2a1e";
    });
  }

  function addLanguageSwitcher() {
    if (!document.body || document.getElementById("wedding-language-switcher")) return;
    const switcher = document.createElement("div");
    switcher.id = "wedding-language-switcher";
    Object.assign(switcher.style, { position:"fixed", top:"12px", right:"12px", zIndex:"2147483647", display:"flex", gap:"4px", padding:"5px", borderRadius:"999px", background:"#fffdf9", border:"1px solid #f5ddd4", boxShadow:"0 5px 24px rgba(92,42,30,.25)" });
    ["fr","en","vi","de"].forEach(code => {
      const button = document.createElement("button");
      button.type = "button"; button.dataset.lang = code; button.textContent = code.toUpperCase();
      Object.assign(button.style, { border:"0", borderRadius:"999px", padding:"8px 11px", cursor:"pointer", fontWeight:"700" });
      button.onclick = () => { currentLanguage = code; localStorage.setItem(LANG_KEY, code); translatePage(); applyEventIdentity(); window.dispatchEvent(new CustomEvent("wedding:language-changed",{detail:{language:code}})); };
      switcher.appendChild(button);
    });
    document.body.appendChild(switcher);
    if (!document.getElementById("wedding-language-mobile-style")) {
      const responsive = document.createElement("style");
      responsive.id = "wedding-language-mobile-style";
      responsive.textContent = `
        :root{--event-header-reserve:96px}
        body.event-language-layout #root{
          box-sizing:border-box;
          padding-top:var(--event-header-reserve)!important;
        }
        body.event-language-layout::before{
          content:"";
          position:fixed;
          z-index:39;
          top:0;left:0;right:0;
          height:var(--event-header-reserve);
          background:var(--white,#fffdf9);
          pointer-events:none;
        }
        #wedding-language-switcher{
          top:max(14px,calc(env(safe-area-inset-top) + 8px))!important;
          right:16px!important;
          left:auto!important;
          width:auto!important;
          max-width:max-content!important;
          gap:2px!important;
          padding:4px!important;
          border-radius:999px!important;
          box-shadow:0 4px 18px rgba(92,42,30,.18)!important;
        }
        #wedding-language-switcher button{
          flex:0 0 auto!important;
          padding:7px 10px!important;
          min-width:0!important;
          font-size:11px!important;
          line-height:1!important;
        }
        @media(max-width:650px){
          :root{--event-header-reserve:104px}
          #wedding-language-switcher{
            top:calc(env(safe-area-inset-top) + 12px)!important;
            right:18px!important;
          }
          #wedding-language-switcher button{
            padding:8px 10px!important;
            font-size:11px!important;
          }
        }
      `;
      document.head.appendChild(responsive);
    }
  }

  const basePath = () => window.location.pathname.endsWith("/") ? window.location.pathname : window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1);

  function closeLivePanel() { document.getElementById("wedding-live-panel")?.remove(); }
  function openLivePanel() {
    if (document.getElementById("wedding-live-panel")) return;
    const event = readEvent();
    const backText = currentLanguage === "en" ? "Back to home" : currentLanguage === "vi" ? "Về trang chủ" : "Retour à l’accueil";
    const panel = document.createElement("section");
    panel.id = "wedding-live-panel";
    Object.assign(panel.style, { position:"fixed", inset:"0", zIndex:"2147483646", background:"#fdf8f4", display:"flex", flexDirection:"column", paddingTop:"var(--event-header-reserve,96px)", boxSizing:"border-box" });
    panel.innerHTML = `<header style="height:64px;display:flex;align-items:center;padding:10px 16px;background:#fffdf9;border-bottom:1px solid #f5ddd4"><button data-back type="button" style="border:0;background:#5c2a1e;color:white;border-radius:999px;padding:10px 17px;cursor:pointer">← ${backText}</button><strong style="margin:auto;font:400 22px Georgia,serif;color:#5c2a1e">${event.name} · Live</strong><span style="width:145px"></span></header><iframe src="${window.location.origin}${basePath()}live.html?w=${encodeURIComponent(EVENT_ID)}" title="Live" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen style="width:100%;flex:1;border:0;background:#1a0d09"></iframe>`;
    panel.querySelector("[data-back]").onclick = closeLivePanel;
    document.body.appendChild(panel);
  }

  function addLiveCard() {
    const event = window.__WEDDING_EVENT__ || {};
    if (event.modules?.live === false) {
      document.getElementById("wedding-live-card")?.remove();
      return;
    }
    if (document.getElementById("wedding-live-card")) return;
    const adminButton = document.querySelector("[data-event-admin-card='true']")
      || [...document.querySelectorAll("button")].find(button => /Administration|Espace organisateur|Organisation|Quản trị/i.test(button.textContent));
    const grid = adminButton?.parentElement;
    if (!grid || getComputedStyle(grid).display !== "grid") return;
    const card = document.createElement("button");
    card.id = "wedding-live-card"; card.type = "button"; card.className = "btn event-card";
    card.innerHTML = '<div style="font-family:var(--event-title-font);font-size:1.2rem;color:var(--burgundy);margin-bottom:2px">🔴 Live de l’événement</div><div style="color:var(--muted);font-size:.82rem">Suivre la diffusion en direct</div>';
    Object.assign(card.style, { background:"var(--white)", border:"1.5px solid var(--blush)", borderRadius:"var(--event-radius)", padding:"1.35rem 1.2rem", textAlign:"left", boxShadow:"0 3px 16px var(--shadow)", cursor:"pointer" });
    card.onclick = openLivePanel;
    grid.insertBefore(card, adminButton);
    translatePage(card);
  }

  function captureAdminSettings() {
    [...document.querySelectorAll("button")].filter(button => /Sauvegarder|Save|Lưu/.test(button.textContent)).forEach(button => {
      if (button.dataset.eventPersistenceBound) return;
      button.dataset.eventPersistenceBound = "true";
      button.addEventListener("click", () => {
        const patch = {};
        document.querySelectorAll("label").forEach(label => {
          const input = label.parentElement?.querySelector("input,textarea");
          if (!input) return;
          const text = label.textContent.trim();
          if (/Nom des mariés|Couple’s names|Tên cô dâu và chú rể/.test(text)) patch.name = input.value.trim();
          if (/^Date$|^Ngày$/.test(text)) patch.date = input.value.trim();
          if (/Message d'accueil|Message d’accueil|Welcome message|Lời chào/.test(text)) patch.coverMessage = input.value;
        });
        if (Object.keys(patch).length) saveEvent(patch);
        setTimeout(refresh, 50);
      }, true);
    });
  }

  function correctAdminInputs() {
    const event = readEvent();
    document.querySelectorAll("label").forEach(label => {
      const input = label.parentElement?.querySelector("input");
      if (!input || document.activeElement === input) return;
      const text = label.textContent.trim();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (/Nom des mariés|Couple’s names|Tên cô dâu và chú rể/.test(text) && (!input.value || /Marie & Thomas|Quentin & Huyen/.test(input.value))) {
        setter?.call(input, event.name); input.dispatchEvent(new Event("input", { bubbles:true }));
      }
      if (/^Date$|^Ngày$/.test(text) && (!input.value || /21 Juin 2025/i.test(input.value))) {
        setter?.call(input, event.date); input.dispatchEvent(new Event("input", { bubbles:true }));
      }
    });
  }

  function refresh() {
    if (!document.body) return;
    if (EVENT_ID && !EVENT_ID.startsWith("__")) document.body.classList.add("event-language-layout");
    document.getElementById("wedding-live-access")?.remove();
    addLanguageSwitcher(); addLiveCard(); applyEventIdentity(); translatePage(); captureAdminSettings(); correctAdminInputs();
  }

  let timer;
  const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(refresh, 40); });
  document.addEventListener("DOMContentLoaded", () => { refresh(); observer.observe(document.body, { childList:true, subtree:true }); });
  window.addEventListener("load", refresh);
  window.addEventListener("wedding:event-updated", event => {
    const detail = event?.detail;
    if (detail && (detail.id === EVENT_ID || detail.slug === EVENT_ID)) {
      saveEvent({
        name: detail.name || DEFAULT_EVENT.name,
        date: detail.date || DEFAULT_EVENT.date,
        location: detail.location || DEFAULT_EVENT.location,
        coverMessage: detail.coverMessage || DEFAULT_EVENT.coverMessage
      });
      refresh();
    }
  });
  setTimeout(refresh, 100);
  setTimeout(refresh, 800);
})();