(() => {
  const DOC_ID = window.__WEDDING_TENANT__?.eventId || "quentin-huyen-2026";
  const PANEL_ID = "wedding-live-settings";

  const getLang = () => localStorage.getItem("mariage-lang") || "fr";
  const text = () => {
    const lang = getLang();
    if (lang === "en") return {
      title: "Live streaming",
      label: "Live link",
      help: "Paste any valid live-streaming link, including VDO.Ninja, YouTube, Vimeo or another service.",
      save: "Save live link",
      saving: "Saving…",
      saved: "Link saved in Firebase.",
      invalid: "Please enter a valid https:// link.",
      error: "Unable to save the link.",
      remove: "Remove link"
    };
    if (lang === "vi") return {
      title: "Phát trực tiếp",
      label: "Liên kết phát trực tiếp",
      help: "Dán bất kỳ liên kết phát trực tiếp hợp lệ nào, gồm VDO.Ninja, YouTube, Vimeo hoặc dịch vụ khác.",
      save: "Lưu liên kết trực tiếp",
      saving: "Đang lưu…",
      saved: "Đã lưu liên kết vào Firebase.",
      invalid: "Hãy nhập liên kết https:// hợp lệ.",
      error: "Không thể lưu liên kết.",
      remove: "Xóa liên kết"
    };
    return {
      title: "Diffusion en direct",
      label: "Lien du live",
      help: "Collez n’importe quel lien de diffusion valide : VDO.Ninja, YouTube, Vimeo ou autre service.",
      save: "Sauvegarder le lien du live",
      saving: "Sauvegarde en cours…",
      saved: "Lien sauvegardé dans Firebase.",
      invalid: "Saisissez un lien https:// valide.",
      error: "Impossible de sauvegarder le lien.",
      remove: "Supprimer le lien"
    };
  };

  function parseLiveUrl(value) {
    const raw = value.trim();
    if (!raw) return { liveUrl: "", playerUrl: "" };
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:") return null;
      return { liveUrl: url.href, playerUrl: url.href };
    } catch {
      return null;
    }
  }

  let firebasePromise;
  async function firebase() {
    if (firebasePromise) return firebasePromise;
    firebasePromise = (async () => {
      const cfg = window.__FIREBASE_CONFIG__ || {};
      const [{ initializeApp, getApps }, fs] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js")
      ]);
      const app = getApps()[0] || initializeApp(cfg);
      return { db: fs.getFirestore(app), fs };
    })();
    return firebasePromise;
  }

  async function readRemote() {
    try {
      const { db, fs } = await firebase();
      const snap = await fs.getDoc(fs.doc(db, "events", DOC_ID));
      return snap.exists() ? snap.data() : {};
    } catch { return {}; }
  }

  async function writeRemote(data) {
    const { db, fs } = await firebase();
    await fs.updateDoc(fs.doc(db, "events", DOC_ID), {
      liveUrl: data.liveUrl || "",
      playerUrl: data.playerUrl || "",
      updatedAt: fs.serverTimestamp()
    });
    window.__WEDDING_EVENT__ = { ...(window.__WEDDING_EVENT__ || {}), ...data };
    window.dispatchEvent(new CustomEvent("wedding:event-updated", { detail: window.__WEDDING_EVENT__ }));
  }

  async function addPanel() {
    if (document.getElementById(PANEL_ID)) return;
    const headings = [...document.querySelectorAll("h3")];
    const tvHeading = headings.find(h => /Affichage TV|TV display|Màn hình trình chiếu/i.test(h.textContent));
    if (!tvHeading) return;
    const tvCard = tvHeading.parentElement;
    const parent = tvCard?.parentElement;
    if (!tvCard || !parent) return;

    const tr = text();
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = "background:var(--white,var(--white));border-radius:18px;padding:1.5rem;box-shadow:0 2px 10px rgba(92,42,30,.12);display:grid;gap:10px";
    panel.innerHTML = `
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.3rem;color:var(--burgundy,var(--burgundy));margin:0">🎥 ${tr.title}</h3>
      <label style="font-size:.75rem;color:var(--muted,var(--muted));display:block">${tr.label}</label>
      <input data-live-url type="url" inputmode="url" placeholder="https://vdo.ninja/?view=..." style="width:100%;padding:11px 13px;border-radius:10px;border:1.5px solid var(--blush,var(--blush));background:var(--cream,var(--cream));font-size:.93rem" />
      <p style="font-size:.76rem;color:var(--muted,var(--muted));margin:0">${tr.help}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button data-save-live type="button" style="flex:1;min-width:210px;padding:11px 15px;border-radius:999px;background:linear-gradient(135deg,var(--rose,var(--rose)),var(--burgundy,var(--burgundy)));color:#fff;font-weight:500">💾 ${tr.save}</button>
        <button data-remove-live type="button" style="padding:11px 15px;border-radius:999px;background:var(--blush,var(--blush));color:var(--burgundy,var(--burgundy))">${tr.remove}</button>
      </div>
      <p data-live-status style="min-height:20px;font-size:.8rem;margin:0"></p>`;
    tvCard.insertAdjacentElement("afterend", panel);

    const input = panel.querySelector("[data-live-url]");
    const status = panel.querySelector("[data-live-status]");
    const save = panel.querySelector("[data-save-live]");
    const remove = panel.querySelector("[data-remove-live]");
    const current = await readRemote();
    input.value = current.liveUrl || "";

    save.onclick = async () => {
      const parsed = parseLiveUrl(input.value);
      if (!parsed) { status.textContent = tr.invalid; status.style.color = "#b83232"; return; }
      save.disabled = true; status.textContent = tr.saving; status.style.color = "var(--muted,var(--muted))";
      try { await writeRemote(parsed); input.value = parsed.liveUrl; status.textContent = tr.saved; status.style.color = "#1e8449"; }
      catch (error) { console.error(error); status.textContent = tr.error; status.style.color = "#b83232"; }
      finally { save.disabled = false; }
    };

    remove.onclick = async () => {
      remove.disabled = true; status.textContent = tr.saving;
      try { await writeRemote({ liveUrl: "", playerUrl: "" }); input.value = ""; status.textContent = tr.saved; status.style.color = "#1e8449"; }
      catch (error) { console.error(error); status.textContent = tr.error; status.style.color = "#b83232"; }
      finally { remove.disabled = false; }
    };
  }

  let timer;
  const refresh = () => { clearTimeout(timer); timer = setTimeout(addPanel, 40); };
  new MutationObserver(refresh).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", refresh);
  window.addEventListener("load", refresh);
  setTimeout(refresh, 300);
})();