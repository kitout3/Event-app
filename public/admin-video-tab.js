(() => {
  const EVENT_ID = window.__WEDDING_TENANT__?.eventId || "quentin-huyen-2026";
  let firebasePromise;
  let activeFilter = "all";
  let refreshTimer = null;

  const isAuthenticated = () =>
    [...document.querySelectorAll("button")].some(button =>
      /^(Déco\.|Déconnexion|Logout|Đăng xuất)$/i.test(button.textContent.trim())
    );

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);

  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = (async () => {
      const config = window.__FIREBASE_CONFIG__ || {};
      if (!config.apiKey || !config.projectId) throw new Error("Configuration Firebase manquante");
      const [{ initializeApp, getApps }, firestore, storage] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js")
      ]);
      const app = getApps()[0] || initializeApp(config);
      return {
        db: firestore.getFirestore(app),
        bucket: storage.getStorage(app),
        firestore,
        storage
      };
    })();
    return firebasePromise;
  }

  async function getVideos() {
    const { db, firestore } = await firebase();
    const query = firestore.query(
      firestore.collection(db, "events", EVENT_ID, "videoTestimonials"),
      firestore.orderBy("createdAt", "desc")
    );
    const snapshot = await firestore.getDocs(query);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      ;
  }

  async function updateVideo(id, patch) {
    const { db, firestore } = await firebase();
    await firestore.updateDoc(firestore.doc(db, "events", EVENT_ID, "videoTestimonials", id), patch);
  }

  async function removeVideo(video) {
    const { db, bucket, firestore, storage } = await firebase();
    await firestore.deleteDoc(firestore.doc(db, "events", EVENT_ID, "videoTestimonials", video.id));
    if (video.path) {
      void storage.deleteObject(storage.ref(bucket, video.path))
        .catch(error => console.warn("Suppression du fichier vidéo :", error));
    }
  }

  function updateFilterCounts(panel, videos) {
    const labels = { all: "Toutes", pending: "En attente", approved: "Validées", rejected: "Refusées" };
    Object.entries(labels).forEach(([filter, label]) => {
      const button = panel.querySelector(`[data-filter="${filter}"]`);
      if (!button) return;
      const count = filter === "all" ? videos.length : videos.filter(video => video.status === filter).length;
      button.textContent = `${label} (${count})`;
    });
  }

  function ensureStyles() {
    if (document.getElementById("admin-video-tab-style")) return;
    const style = document.createElement("style");
    style.id = "admin-video-tab-style";
    style.textContent = `
      #admin-video-panel{display:none;padding:1.25rem}
      #admin-video-panel.is-visible{display:block}
      .av-filters{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
      .av-filter{padding:6px 14px;border-radius:999px;border:1.5px solid var(--blush,var(--blush));background:var(--white,var(--white));color:var(--muted,var(--muted));font:inherit}
      .av-filter.active{background:var(--text,var(--text));border-color:var(--text,var(--text));color:#fff}
      .av-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
      .av-card{background:var(--white,var(--white));border:2px solid transparent;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(92,42,30,.12)}
      .av-card.pending{border-color:#f1c40f}.av-card.approved{border-color:#27ae60}.av-card.rejected{border-color:#e74c3c}
      .av-card video{display:block;width:100%;aspect-ratio:16/9;background:#000;object-fit:contain}
      .av-body{padding:12px;display:grid;gap:8px}.av-meta{font-size:.8rem;color:var(--muted,var(--muted))}
      .av-status{display:inline-block;width:max-content;border-radius:999px;padding:3px 9px;font-size:.75rem;font-weight:600}
      .av-actions{display:flex;gap:7px;flex-wrap:wrap}.av-action{border:0;border-radius:999px;padding:8px 12px;font:inherit;cursor:pointer}
      .av-ok{background:#27ae60;color:#fff}.av-no{background:#f39c12;color:#fff}.av-del{background:#e74c3c;color:#fff}.av-download{background:var(--blush);color:var(--burgundy);text-decoration:none}
      .av-empty{text-align:center;padding:3rem;color:var(--muted,var(--muted))}
    `;
    document.head.appendChild(style);
  }

  function setNativeContentVisible(content, visible) {
    [...content.children].forEach(child => {
      if (child.id !== "admin-video-panel") child.style.display = visible ? "" : "none";
    });
  }

  function activateVideoTab(tabBar, content, videoButton) {
    [...tabBar.querySelectorAll("button")].forEach(button => {
      button.style.background = button === videoButton ? "var(--burgundy)" : "var(--white)";
      button.style.color = button === videoButton ? "white" : "var(--muted)";
      button.style.borderColor = button === videoButton ? "var(--burgundy)" : "var(--blush)";
    });
    setNativeContentVisible(content, false);
    const panel = content.querySelector("#admin-video-panel");
    panel?.classList.add("is-visible");
    renderVideos(panel);
  }

  function restoreNativeTab(content) {
    content.querySelector("#admin-video-panel")?.classList.remove("is-visible");
    setNativeContentVisible(content, true);
  }

  async function renderVideos(panel) {
    if (!panel || !isAuthenticated()) return;
    panel.innerHTML = '<div class="av-empty">Chargement des vidéos…</div>';
    try {
      const videos = await getVideos();
      let currentVideos = videos;
      const counts = {
        all: videos.length,
        pending: videos.filter(v => v.status === "pending").length,
        approved: videos.filter(v => v.status === "approved").length,
        rejected: videos.filter(v => v.status === "rejected").length
      };
      const filtered = activeFilter === "all" ? videos : videos.filter(video => video.status === activeFilter);
      panel.innerHTML = `
        <div class="av-filters">
          <button class="av-filter ${activeFilter === "all" ? "active" : ""}" data-filter="all">Toutes (${counts.all})</button>
          <button class="av-filter ${activeFilter === "pending" ? "active" : ""}" data-filter="pending">En attente (${counts.pending})</button>
          <button class="av-filter ${activeFilter === "approved" ? "active" : ""}" data-filter="approved">Validées (${counts.approved})</button>
          <button class="av-filter ${activeFilter === "rejected" ? "active" : ""}" data-filter="rejected">Refusées (${counts.rejected})</button>
        </div>
        <div class="av-grid"></div>`;

      panel.querySelectorAll("[data-filter]").forEach(button => {
        button.onclick = () => { activeFilter = button.dataset.filter; renderVideos(panel); };
      });

      const grid = panel.querySelector(".av-grid");
      if (!filtered.length) {
        grid.innerHTML = '<div class="av-empty">Aucune vidéo dans cette catégorie.</div>';
        return;
      }

      filtered.forEach(video => {
        const status = video.status || "pending";
        const labels = { pending: "En attente", approved: "Validée", rejected: "Refusée" };
        const card = document.createElement("article");
        card.className = `av-card ${status}`;
        card.innerHTML = `
          <video controls playsinline preload="metadata" src="${escapeHtml(video.url)}"></video>
          <div class="av-body">
            <strong>${escapeHtml(video.author || "Sans prénom")}</strong>
            ${video.message ? `<p>${escapeHtml(video.message)}</p>` : ""}
            <div class="av-meta">${Math.round(Number(video.duration) || 0)} s · ${Math.round((Number(video.size) || 0) / 1048576)} Mo</div>
            <span class="av-status">${labels[status] || status}</span>
            <div class="av-actions">
              <button class="av-action av-ok" data-approve>✓ Valider</button>
              <button class="av-action av-no" data-reject>✕ Refuser</button>
              <button type="button" class="av-action av-download" data-download>⬇ Télécharger</button>
              <button class="av-action av-del" data-delete>🗑 Supprimer</button>
            </div>
          </div>`;
        card.querySelector("[data-approve]").onclick = async () => {
          await updateVideo(video.id, { status: "approved", selectedForTv: true });
          await renderVideos(panel);
        };
        card.querySelector("[data-reject]").onclick = async () => {
          await updateVideo(video.id, { status: "rejected", selectedForTv: false });
          await renderVideos(panel);
        };
        card.querySelector("[data-download]").onclick = async event => {
          event.preventDefault();
          event.stopPropagation();
          const button = event.currentTarget;
          const originalLabel = button.textContent;
          const extension = (video.mimeType || "").includes("quicktime") ? "mov"
            : (video.mimeType || "").includes("webm") ? "webm"
              : ((video.path || "").split(".").pop() || "mp4");
          button.disabled = true;
          button.textContent = "Préparation…";
          try {
            if (typeof window.weddingDownloadMedia !== "function") throw new Error("Module de téléchargement indisponible");
            await window.weddingDownloadMedia({
              kind: "video",
              id: video.id,
              url: video.url,
              name: `video-${video.id}.${extension}`,
            });
          } catch (error) {
            if (error?.name !== "AbortError") {
              console.error("Téléchargement vidéo :", error);
              alert("La vidéo n’a pas pu être téléchargée.");
            }
          } finally {
            button.disabled = false;
            button.textContent = originalLabel;
          }
        };
        card.querySelector("[data-delete]").onclick = async () => {
          if (!confirm("Supprimer définitivement cette vidéo ?")) return;
          currentVideos = currentVideos.filter(item => item.id !== video.id);
          card.remove();
          updateFilterCounts(panel, currentVideos);
          if (!grid.querySelector(".av-card")) grid.innerHTML = '<div class="av-empty">Aucune vidéo dans cette catégorie.</div>';
          try {
            await removeVideo(video);
          } catch (error) {
            console.error("Suppression vidéo :", error);
            alert("La suppression a échoué. La liste va être actualisée.");
            await renderVideos(panel);
          }
        };
        grid.appendChild(card);
      });
    } catch (error) {
      console.error("Administration vidéos :", error);
      panel.innerHTML = '<div class="av-empty">Impossible de charger les vidéos. Vérifiez les règles Firestore et la connexion.</div>';
    }
  }

  function installTab() {
    ensureStyles();
    if (window.__WEDDING_EVENT__?.modules?.videoTestimonials === false) {
      document.getElementById("admin-video-tab")?.remove();
      document.getElementById("admin-video-panel")?.remove();
      return;
    }
    if (!isAuthenticated()) {
      document.getElementById("admin-video-tab")?.remove();
      document.getElementById("admin-video-panel")?.remove();
      return;
    }

    const photosButton = [...document.querySelectorAll("button")].find(button => /Photos/.test(button.textContent));
    const tabBar = photosButton?.parentElement;
    const content = tabBar?.nextElementSibling;
    if (!photosButton || !tabBar || !content) return;

    let videoButton = document.getElementById("admin-video-tab");
    if (!videoButton) {
      videoButton = document.createElement("button");
      videoButton.id = "admin-video-tab";
      videoButton.className = "btn";
      videoButton.textContent = "🎥 Vidéos";
      Object.assign(videoButton.style, {
        padding: "7px 18px", borderRadius: "50px", fontSize: ".85rem", whiteSpace: "nowrap",
        background: "var(--white)", color: "var(--muted)", border: "1.5px solid var(--blush)"
      });
      tabBar.insertBefore(videoButton, photosButton.nextSibling);
    }

    let panel = content.querySelector("#admin-video-panel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "admin-video-panel";
      content.appendChild(panel);
    }

    videoButton.onclick = () => activateVideoTab(tabBar, content, videoButton);
    [...tabBar.querySelectorAll("button")].filter(button => button !== videoButton).forEach(button => {
      if (button.dataset.avBound) return;
      button.dataset.avBound = "1";
      button.addEventListener("click", () => restoreNativeTab(content));
    });
  }

  const observer = new MutationObserver(() => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(installTab, 40);
  });

  document.addEventListener("DOMContentLoaded", () => {
    installTab();
    observer.observe(document.body, { childList: true, subtree: true });
  });
  window.addEventListener("load", installTab);
})();
