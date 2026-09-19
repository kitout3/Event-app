(() => {
  "use strict";

  const LANG_KEY = "mariage-lang";
  const rows = [
    ["Envoyer une photo", "Upload a photo", "Gửi ảnh"],
    ["Partager un souvenir", "Share a memory", "Chia sẻ kỷ niệm"],
    ["Galerie & réactions", "Gallery & reactions", "Thư viện ảnh và cảm xúc"],
    ["Voir toutes les photos", "View all photos", "Xem tất cả ảnh"],
    ["Affichage TV", "TV display", "Màn hình trình chiếu"],
    ["Diaporama plein écran", "Full-screen slideshow", "Trình chiếu toàn màn hình"],
    ["Administration", "Administration", "Quản trị"],
    ["Modérer et exporter", "Moderate and export", "Kiểm duyệt và xuất dữ liệu"],
    ["Modérer & exporter", "Moderate and export", "Kiểm duyệt và xuất dữ liệu"],
    ["Regarder le live", "Watch live", "Xem trực tiếp"],
    ["Suivre la cérémonie en direct", "Watch the ceremony live", "Theo dõi lễ cưới trực tiếp"],
    ["QR Code invités", "Guest QR code", "Mã QR dành cho khách"],
    ["Copier le lien", "Copy link", "Sao chép liên kết"],
    ["Connexion…", "Connecting…", "Đang kết nối…"],
    ["Retour à l’accueil", "Back to home", "Về trang chủ"],
    ["Votre prénom (optionnel)", "Your first name (optional)", "Tên của bạn (không bắt buộc)"],
    ["Un petit mot (optionnel)", "A short message (optional)", "Lời nhắn ngắn (không bắt buộc)"],
    ["Choisir une photo", "Choose a photo", "Chọn ảnh"],
    ["Prendre une photo", "Take a photo", "Chụp ảnh"],
    ["Envoyer", "Send", "Gửi"],
    ["Annuler", "Cancel", "Hủy"],
    ["Réessayer", "Try again", "Thử lại"],
    ["Merci !", "Thank you!", "Cảm ơn!"],
    ["Photo envoyée", "Photo uploaded", "Ảnh đã được gửi"],
    ["Voir la galerie", "View gallery", "Xem thư viện"],
    ["Toutes", "All", "Tất cả"],
    ["Publiées", "Published", "Đã đăng"],
    ["En attente", "Pending", "Đang chờ"],
    ["Refusées", "Rejected", "Đã từ chối"],
    ["Aucune photo ici", "No photos here", "Chưa có ảnh"],
    ["Photo mise à jour", "Photo updated", "Ảnh đã được cập nhật"],
    ["Supprimée", "Deleted", "Đã xóa"],
    ["Photos", "Photos", "Ảnh"],
    ["Statistiques", "Statistics", "Thống kê"],
    ["Stats", "Statistics", "Thống kê"],
    ["Paramètres", "Settings", "Cài đặt"],
    ["Export", "Export", "Xuất dữ liệu"],
    ["Événement", "Event", "Sự kiện"],
    ["Nom des mariés", "Couple’s names", "Tên cô dâu và chú rể"],
    ["Date", "Date", "Ngày"],
    ["Message d’accueil", "Welcome message", "Lời chào"],
    ["Message d'accueil", "Welcome message", "Lời chào"],
    ["Mot de passe administrateur", "Admin password", "Mật khẩu quản trị"],
    ["Mot de passe admin", "Admin password", "Mật khẩu quản trị"],
    ["Modération", "Moderation", "Kiểm duyệt"],
    ["Immédiate", "Immediate", "Ngay lập tức"],
    ["Photos visibles dès l’envoi", "Photos visible immediately after upload", "Ảnh hiển thị ngay sau khi gửi"],
    ["Modérée", "Moderated", "Có kiểm duyệt"],
    ["Validation manuelle", "Manual approval", "Duyệt thủ công"],
    ["Différée", "Delayed", "Trì hoãn"],
    ["Affichage automatique après un délai", "Automatic display after a delay", "Tự động hiển thị sau một khoảng thời gian"],
    ["Mur", "Wall", "Tường ảnh"],
    ["Diaporama", "Slideshow", "Trình chiếu"],
    ["Diapo", "Slideshow", "Trình chiếu"],
    ["Mixte", "Mixed", "Kết hợp"],
    ["Sauvegarder", "Save", "Lưu"],
    ["Paramètres sauvegardés", "Settings saved", "Đã lưu cài đặt"],
    ["Mot de passe", "Password", "Mật khẩu"],
    ["Se connecter", "Sign in", "Đăng nhập"],
    ["Mot de passe incorrect", "Incorrect password", "Mật khẩu không đúng"],
    ["Déconnexion", "Sign out", "Đăng xuất"],
    ["Déco.", "Sign out", "Đăng xuất"],
    ["Accueil", "Home", "Trang chủ"],
    ["Total", "Total", "Tổng cộng"],
    ["Réactions", "Reactions", "Cảm xúc"],
    ["Photos par heure", "Photos by hour", "Ảnh theo giờ"],
    ["Aucune donnée", "No data", "Không có dữ liệu"],
    ["Photos les plus aimées", "Most liked photos", "Ảnh được yêu thích nhất"],
    ["Télécharger le CSV", "Download CSV", "Tải tệp CSV"],
    ["Télécharger les photos", "Download photos", "Tải ảnh"],
    ["Exporter", "Export", "Xuất dữ liệu"],
    ["Dernière", "Latest", "Mới nhất"],
    ["Photo la plus aimée", "Most liked photo", "Ảnh được yêu thích nhất"],
    ["Cérémonie en direct", "Live ceremony", "Lễ cưới trực tiếp"],
    ["Le direct n’est pas encore configuré", "The live stream is not configured yet", "Buổi phát trực tiếp chưa được cấu hình"],
    ["Ouvrir le lecteur", "Open player", "Mở trình phát"],
    ["Diffusion en direct", "Live streaming", "Phát trực tiếp"],
    ["Lien YouTube du live", "YouTube live link", "Liên kết YouTube trực tiếp"],
    ["Sauvegarder le lien du live", "Save live link", "Lưu liên kết trực tiếp"],
    ["Lien YouTube invalide.", "Invalid YouTube link.", "Liên kết YouTube không hợp lệ."],
    ["Sauvegarde en cours…", "Saving…", "Đang lưu…"],
    ["Lien sauvegardé dans Firebase.", "Link saved in Firebase.", "Đã lưu liên kết vào Firebase."]
  ];

  const languageIndex = { fr: 0, en: 1, vi: 2 };
  const reverse = new Map();
  rows.forEach((row, rowIndex) => row.forEach(value => reverse.set(value, rowIndex)));

  let language = localStorage.getItem(LANG_KEY) || (navigator.language || "fr").slice(0, 2).toLowerCase();
  if (!(language in languageIndex)) language = "fr";
  let applying = false;

  function translateString(value) {
    const trimmed = value.trim();
    if (!trimmed) return value;

    const exactRow = reverse.get(trimmed);
    if (exactRow !== undefined) {
      return value.replace(trimmed, rows[exactRow][languageIndex[language]]);
    }

    for (const [variant, rowIndex] of reverse.entries()) {
      if (trimmed.startsWith(`${variant} (`) || trimmed.startsWith(`${variant} ·`) || trimmed.startsWith(`${variant} :`)) {
        return value.replace(variant, rows[rowIndex][languageIndex[language]]);
      }
    }
    return value;
  }

  function applyLanguage(root = document.body) {
    if (!root || applying) return;
    applying = true;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        if (node.parentElement?.closest("script,style")) return;
        let next = translateString(node.nodeValue);
        if (next !== node.nodeValue) node.nodeValue = next;
      });

      root.querySelectorAll?.("input, textarea").forEach(input => {
        const placeholder = input.getAttribute("placeholder");
        if (placeholder) input.setAttribute("placeholder", translateString(placeholder));
      });

      document.documentElement.lang = language;
      document.querySelectorAll("#wedding-language-switcher button").forEach(button => {
        const active = button.dataset.lang === language;
        button.style.background = active ? "#5c2a1e" : "transparent";
        button.style.color = active ? "white" : "#5c2a1e";
        button.setAttribute("aria-pressed", String(active));
      });
    } finally {
      applying = false;
    }
  }

  function setLanguage(nextLanguage) {
    if (!(nextLanguage in languageIndex)) return;
    language = nextLanguage;
    localStorage.setItem(LANG_KEY, language);
    applyLanguage(document.body);
    requestAnimationFrame(() => applyLanguage(document.body));
    setTimeout(() => applyLanguage(document.body), 50);
  }

  document.addEventListener("click", event => {
    const button = event.target.closest?.("#wedding-language-switcher button[data-lang]");
    if (!button) return;
    setTimeout(() => setLanguage(button.dataset.lang), 0);
  });

  window.addEventListener("storage", event => {
    if (event.key === LANG_KEY && event.newValue) setLanguage(event.newValue);
  });

  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => applyLanguage(document.body), 20);
  });

  function start() {
    applyLanguage(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
