(() => {
  const CHAT_ID = "wedding-live-chat";
  const TOGGLE_ID = "wedding-live-chat-toggle";
  const STYLE_ID = "wedding-live-chat-style";
  const EVENT_ID = window.__WEDDING_TENANT__?.eventId || "quentin-huyen-2026";
  const COLLECTION = "liveChatMessages";
  let mountedHost = null;
  let unsubscribe = null;

  const escapeHtml = value => String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  function getLang() {
    const value = localStorage.getItem("mariage-lang") || "fr";
    return ["fr", "en", "vi"].includes(value) ? value : "fr";
  }

  const texts = {
    fr: { title: "Discussion en direct", comments: "Commentaires", name: "Votre prénom", message: "Écrire un message…", send: "Envoyer", empty: "Soyez le premier à écrire un message.", error: "Le chat ne peut pas être chargé.", sending: "Envoi…" },
    en: { title: "Live chat", comments: "Comments", name: "Your name", message: "Write a message…", send: "Send", empty: "Be the first to write a message.", error: "The chat could not be loaded.", sending: "Sending…" },
    vi: { title: "Trò chuyện trực tiếp", comments: "Bình luận", name: "Tên của bạn", message: "Viết tin nhắn…", send: "Gửi", empty: "Hãy là người đầu tiên gửi tin nhắn.", error: "Không thể tải trò chuyện.", sending: "Đang gửi…" }
  };
  const t = key => window.EventI18n?.translate(texts.fr[key]) || texts[getLang()][key];

  function formatTime(timestamp) {
    const date = timestamp?.toDate?.() || new Date();
    const locale = window.EventI18n?.locale || "fr-FR";
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #wedding-live-panel [data-live-main] {
        --wedding-chat-width: 300px;
      }
      #wedding-live-panel #${CHAT_ID} {
        width: var(--wedding-chat-width);
        flex: 0 0 var(--wedding-chat-width);
        height: 100%;
        min-height: 0;
        background: var(--white);
        border-left: 1px solid var(--blush);
        padding: 12px;
        display: grid;
        grid-template-rows: auto minmax(80px, 1fr) auto;
        gap: 9px;
        box-sizing: border-box;
        color: var(--text);
        overflow: hidden;
        opacity: 1;
        transform: translateX(0);
        transition: width .25s ease, flex-basis .25s ease, padding .25s ease, opacity .2s ease, transform .25s ease;
      }
      #wedding-live-panel [data-live-main][data-chat-collapsed="true"] #${CHAT_ID} {
        width: 0;
        flex-basis: 0;
        padding-left: 0;
        padding-right: 0;
        border-left: 0;
        opacity: 0;
        pointer-events: none;
      }
      #wedding-live-panel #${TOGGLE_ID} {
        position: absolute;
        top: 12px;
        right: calc(var(--wedding-chat-width) + 10px);
        z-index: 8;
        min-height: 38px;
        border: 1px solid rgba(255,255,255,.28);
        border-radius: 999px;
        padding: 7px 11px;
        background: rgba(20,12,8,.78);
        color: white;
        box-shadow: 0 3px 14px rgba(0,0,0,.24);
        backdrop-filter: blur(10px);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font: 500 .76rem 'Jost',Arial,sans-serif;
        transition: right .25s ease, background .2s ease;
      }
      #wedding-live-panel [data-live-main][data-chat-collapsed="true"] #${TOGGLE_ID} {
        right: 12px;
        background: rgba(92,42,30,.9);
      }
      #wedding-live-panel #${TOGGLE_ID} [data-chat-unread] {
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        border-radius: 999px;
        background: #e53935;
        color: white;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: .66rem;
        font-weight: 700;
        line-height: 1;
        box-shadow: 0 0 0 2px rgba(255,255,255,.9);
      }
      #wedding-live-panel #${TOGGLE_ID} [data-chat-unread][hidden] {
        display: none;
      }
      #wedding-live-panel #${CHAT_ID} [data-chat-form] {
        display: grid;
        grid-template-columns: minmax(0,1fr) auto;
        gap: 7px;
        align-items: center;
      }
      #wedding-live-panel #${CHAT_ID} [data-chat-name] {
        grid-column: 1 / -1;
      }
      @media (max-width: 760px) {
        #wedding-live-panel [data-live-main] {
          --wedding-chat-width: min(86vw, 320px);
        }
        #wedding-live-panel #${CHAT_ID} {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: 7;
          width: var(--wedding-chat-width);
          flex-basis: var(--wedding-chat-width);
          box-shadow: -8px 0 28px rgba(0,0,0,.24);
        }
        #wedding-live-panel [data-live-main][data-chat-collapsed="true"] #${CHAT_ID} {
          width: var(--wedding-chat-width);
          flex-basis: var(--wedding-chat-width);
          padding: 12px;
          border-left: 1px solid var(--blush);
          transform: translateX(100%);
        }
        #wedding-live-panel #${TOGGLE_ID} {
          right: calc(var(--wedding-chat-width) + 8px);
        }
        #wedding-live-panel [data-live-main][data-chat-collapsed="true"] #${TOGGLE_ID} {
          right: 10px;
        }
      }
      @media (max-width: 390px) {
        #wedding-live-panel #${TOGGLE_ID} [data-chat-toggle-label] {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setCollapsed(host, toggle, container, collapsed) {
    host.dataset.collapsed = collapsed ? "true" : "false";
    container.dataset.chatCollapsed = collapsed ? "true" : "false";
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  function findOrCreateHost() {
    const panel = document.getElementById("wedding-live-panel");
    if (panel) {
      const container = panel.querySelector("[data-live-main]") || panel;
      let host = container.querySelector(`#${CHAT_ID}`);
      if (!host) {
        host = document.createElement("section");
        host.id = CHAT_ID;
        container.appendChild(host);
      }
      let toggle = container.querySelector(`#${TOGGLE_ID}`);
      if (!toggle) {
        toggle = document.createElement("button");
        toggle.id = TOGGLE_ID;
        toggle.type = "button";
        toggle.setAttribute("aria-controls", CHAT_ID);
        toggle.innerHTML = `<span aria-hidden="true">💬</span><span data-chat-toggle-label>${t("comments")}</span><span data-chat-unread hidden></span>`;
        container.appendChild(toggle);
      }
      return host;
    }
    return document.getElementById("liveChat");
  }

  async function mount(host) {
    if (!host || host === mountedHost) return;
    unsubscribe?.();
    unsubscribe = null;
    mountedHost = host;

    const container = host.parentElement;
    const toggle = container?.querySelector?.(`#${TOGGLE_ID}`);
    const initialCollapsed = !!toggle && window.matchMedia("(max-width: 760px)").matches;
    if (toggle) setCollapsed(host, toggle, container, initialCollapsed);

    host.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <h2 style="margin:0;font:600 1.25rem 'Cormorant Garamond',Georgia,serif;color:var(--burgundy)">💬 ${t("title")}</h2>
        <span data-chat-count style="font-size:.75rem;color:var(--muted)"></span>
      </div>
      <div data-chat-list style="overflow:auto;display:grid;align-content:start;gap:8px;padding:2px 2px 4px"><p style="margin:auto;color:var(--muted)">${t("empty")}</p></div>
      <form data-chat-form>
        <input data-chat-name maxlength="30" placeholder="${t("name")}" autocomplete="name" style="min-width:0;padding:10px 11px;border:1px solid var(--blush);border-radius:12px;background:var(--cream);font:inherit" />
        <input data-chat-message maxlength="300" placeholder="${t("message")}" required autocomplete="off" style="min-width:0;padding:10px 11px;border:1px solid var(--blush);border-radius:12px;background:var(--cream);font:inherit" />
        <button data-chat-send type="submit" style="border:0;border-radius:999px;padding:10px 15px;background:var(--burgundy);color:white;font-weight:600;cursor:pointer">${t("send")}</button>
      </form>`;

    const list = host.querySelector("[data-chat-list]");
    const count = host.querySelector("[data-chat-count]");
    const form = host.querySelector("[data-chat-form]");
    const nameInput = host.querySelector("[data-chat-name]");
    const messageInput = host.querySelector("[data-chat-message]");
    const sendButton = host.querySelector("[data-chat-send]");
    const unreadBadge = toggle?.querySelector("[data-chat-unread]");
    let previousMessageCount = null;
    let unreadCount = 0;

    const renderUnread = () => {
      if (!unreadBadge) return;
      unreadBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
      unreadBadge.hidden = unreadCount === 0;
    };

    if (toggle) {
      toggle.onclick = () => {
        const collapsed = host.dataset.collapsed !== "true";
        setCollapsed(host, toggle, container, collapsed);
        if (!collapsed) {
          unreadCount = 0;
          renderUnread();
          requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
        }
      };
    }
    nameInput.value = localStorage.getItem("wedding-chat-name") || "";

    try {
      const [{ initializeApp, getApps }, fs] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js")
      ]);
      const config = window.__FIREBASE_CONFIG__ || {};
      if (!config.apiKey || !config.projectId) throw new Error("Firebase configuration missing");
      const app = getApps()[0] || initializeApp(config);
      const db = fs.getFirestore(app);
      const query = fs.query(fs.collection(db, "events", EVENT_ID, COLLECTION), fs.orderBy("createdAt", "asc"), fs.limit(300));

      unsubscribe = fs.onSnapshot(query, snapshot => {
        const messages = snapshot.docs.map(doc => doc.data()).filter(item => item.eventId === EVENT_ID).slice(-150);
        count.textContent = messages.length ? `${messages.length} message${messages.length > 1 ? "s" : ""}` : "";
        if (host.dataset.collapsed === "true") {
          if (previousMessageCount === null) unreadCount = messages.length;
          else if (messages.length > previousMessageCount) unreadCount += messages.length - previousMessageCount;
        } else {
          unreadCount = 0;
        }
        previousMessageCount = messages.length;
        renderUnread();
        list.innerHTML = "";
        if (!messages.length) {
          list.innerHTML = `<p style="margin:auto;color:var(--muted)">${t("empty")}</p>`;
          return;
        }
        messages.forEach(item => {
          const row = document.createElement("article");
          row.style.cssText = "background:var(--cream);border:1px solid var(--blush);border-radius:12px;padding:8px 10px";
          row.innerHTML = `<div style="display:flex;justify-content:space-between;gap:10px"><strong translate="no" style="color:var(--burgundy);font-size:.88rem">${escapeHtml(item.name || window.EventI18n?.translate("Invité") || "Invité")}</strong><time style="color:var(--muted);font-size:.7rem">${formatTime(item.createdAt)}</time></div><p translate="no" style="margin:3px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.88rem">${escapeHtml(item.message)}</p>`;
          list.appendChild(row);
        });
        list.scrollTop = list.scrollHeight;
      }, error => {
        console.error("Live chat:", error);
        list.innerHTML = `<p style="margin:auto;color:#b83232">${t("error")}</p>`;
      });

      form.addEventListener("submit", async event => {
        event.preventDefault();
        const name = nameInput.value.trim().slice(0, 30) || "Invité";
        const message = messageInput.value.trim().slice(0, 300);
        if (!message) return;
        sendButton.disabled = true;
        sendButton.textContent = t("sending");
        try {
          localStorage.setItem("wedding-chat-name", name === "Invité" ? "" : name);
          await fs.addDoc(fs.collection(db, "events", EVENT_ID, COLLECTION), { eventId: EVENT_ID, name, message, createdAt: fs.serverTimestamp() });
          messageInput.value = "";
        } catch (error) {
          console.error("Send chat message:", error);
          alert(t("error"));
        } finally {
          sendButton.disabled = false;
          sendButton.textContent = t("send");
          messageInput.focus();
        }
      });
    } catch (error) {
      console.error("Live chat init:", error);
      list.innerHTML = `<p style="margin:auto;color:#b83232">${t("error")}</p>`;
    }
  }

  function scan() {
    const host = findOrCreateHost();
    if (host) mount(host);
    else if (mountedHost && !document.body.contains(mountedHost)) {
      unsubscribe?.();
      unsubscribe = null;
      mountedHost = null;
    }
  }

  const observer = new MutationObserver(() => setTimeout(scan, 20));
  installStyles();
  document.addEventListener("DOMContentLoaded", () => {
    installStyles();
    scan();
    observer.observe(document.body, { childList: true, subtree: true });
  });
  window.addEventListener("hashchange", () => setTimeout(scan, 30));
})();
