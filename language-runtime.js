(() => {
  "use strict";
  const codes = ["fr", "en", "vi", "de"];
  const locales = { fr:"fr-FR", en:"en-GB", vi:"vi-VN", de:"de-DE" };
  const key = "mariage-lang";
  const normalize = value => String(value).replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  const rows = window.EVENT_TRANSLATIONS || [];
  const reverse = new Map();
  const patterns = [];
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  rows.forEach(row => {
    if (row.length !== 4 || row.some(value => typeof value !== "string" || !value)) throw new Error("Incomplete translation: " + row[0]);
    row.forEach(value => reverse.set(normalize(value), row));
    if (row[0].includes("{")) {
      row.forEach(value => {
        const names = [];
        const parts = normalize(value).split(/(\{\w+\})/g).map(part => {
          if (/^\{\w+\}$/.test(part)) {
            const name = part.slice(1, -1); names.push(name);
            return ["count","paid","published","done","total"].includes(name) ? "(\\d+)" : "(.+?)";
          }
          return escape(part);
        });
        patterns.push({ re:new RegExp("^" + parts.join("") + "$"), names, row });
      });
    }
  });
  // Prefer original French keys where translations share a word (Photos, Export, etc.).
  rows.forEach(row => reverse.set(normalize(row[0]), row));
  let language;
  try { language = localStorage.getItem(key); } catch {}
  if (!codes.includes(language)) language = (navigator.language || "fr").slice(0,2).toLowerCase();
  if (!codes.includes(language)) language = "fr";
  const sourceText = new WeakMap();
  let titleSource = document.title;
  let titleOutput = document.title;
  const sourceAttributes = new WeakMap();
  const ignored = 'script,style,textarea,code,pre,[translate="no"],[data-i18n-ignore],#wedding-language-switcher';
  function core(value, lang) {
    const clean = normalize(value);
    const row = reverse.get(clean);
    if (row) return row[codes.indexOf(lang)];
    for (const pattern of patterns) {
      const match = clean.match(pattern.re);
      if (match) return pattern.row[codes.indexOf(lang)].replace(/\{(\w+)\}/g, (_, name) => match[pattern.names.indexOf(name) + 1] ?? "");
    }
    return null;
  }
  function translate(value, lang = language) {
    if (typeof value !== "string" || !value.trim() || !codes.includes(lang)) return value;
    const trimmed = value.trim();
    let result = core(trimmed, lang);
    if (result === null) {
      // Icons, counters and punctuation around a complete UI label are preserved.
      const decorated = trimmed.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
      if (decorated) {
        const middle = core(decorated[2], lang);
        if (middle !== null) result = decorated[1] + middle + decorated[3];
      }
    }
    if (result === null) {
      const suffix = trimmed.match(/^(.*?)\s+(\(\d+\)|\d+%|\d+\/\d+)$/);
      if (suffix) { const label = core(suffix[1], lang); if (label !== null) result = label + " " + suffix[2]; }
    }
    if (result === null && trimmed.includes(" · ")) {
      const parts = trimmed.split(" · ").map(part => translate(part, lang));
      if (parts.join(" · ") !== trimmed) result = parts.join(" · ");
    }
    return result === null ? value : value.replace(trimmed, result);
  }
  function updateText(node) {
    if (node.parentElement?.closest(ignored)) return;
    const current = node.nodeValue;
    const saved = sourceText.get(node);
    const source = saved && saved.output === current ? saved.source : current;
    const output = translate(source);
    sourceText.set(node, {source, output});
    if (current !== output) node.nodeValue = output;
  }
  function updateAttributes(element) {
    if (element.closest('script,style,[translate="no"],[data-i18n-ignore],#wedding-language-switcher')) return;
    let saved = sourceAttributes.get(element);
    if (!saved) { saved = {}; sourceAttributes.set(element, saved); }
    for (const attr of ["placeholder","title","aria-label","alt"]) {
      const current = element.getAttribute(attr);
      if (!current) continue;
      const source = saved[attr]?.output === current ? saved[attr].source : current;
      const output = translate(source);
      saved[attr] = {source, output};
      if (current !== output) element.setAttribute(attr, output);
    }
  }
  let applying = false;
  function apply(root = document.body) {
    if (!root || applying) return;
    applying = true;
    try {
      if (root.nodeType === 3) updateText(root);
      else {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) updateText(walker.currentNode);
        if (root.nodeType === 1) updateAttributes(root);
        root.querySelectorAll?.("[placeholder],[title],[aria-label],[alt]").forEach(updateAttributes);
      }
      if (document.documentElement.lang !== language) document.documentElement.lang = language;
    } finally { applying = false; }
  }
  function buttons() {
    document.querySelectorAll("#wedding-language-switcher button").forEach(button => {
      const active = button.dataset.lang === language;
      button.style.background = active ? "#5c2a1e" : "transparent";
      button.style.color = active ? "#fff" : "#5c2a1e";
      button.setAttribute("aria-pressed", String(active));
    });
  }
  function setLanguage(next, persist = true) {
    if (!codes.includes(next)) return;
    language = next;
    if (persist) { try { localStorage.setItem(key, next); } catch {} }
    apply();
    if (document.title !== titleOutput) titleSource = document.title;
    titleOutput = translate(titleSource); document.title = titleOutput;
    buttons();
    window.dispatchEvent(new CustomEvent("wedding:language-changed", {detail:{language:next}}));
  }
  window.EventI18n = {
    translate, apply, setLanguage,
    get language() { return language; },
    get locale() { return locales[language]; },
    dictionary(source) { return Object.fromEntries(Object.entries(source).map(([name,value]) => [name, translate(value)])); },
    t(source, values = {}) { return translate(source).replace(/\{(\w+)\}/g, (match,name) => String(values[name] ?? match)); }
  };
  // Native confirmation/error dialogs do not pass through the DOM.
  for (const method of ["alert","confirm","prompt"]) {
    if (typeof window[method] !== "function") continue;
    const original = window[method].bind(window);
    window[method] = (message, ...args) => original(translate(String(message)), ...args);
  }
  function installSwitcher() {
    if (document.getElementById("wedding-language-switcher")) return;
    const switcher = document.createElement("nav");
    switcher.id = "wedding-language-switcher";
    switcher.setAttribute("aria-label", "Français / English / Tiếng Việt / Deutsch");
    const names = {fr:"Français",en:"English",vi:"Tiếng Việt",de:"Deutsch"};
    codes.forEach(code => {
      const button = document.createElement("button");
      button.type = "button"; button.dataset.lang = code;
      button.textContent = code.toUpperCase(); button.lang = code;
      button.setAttribute("aria-label", names[code]);
      button.onclick = () => setLanguage(code);
      switcher.appendChild(button);
    });
    document.body.appendChild(switcher);
    document.body.classList.add("event-language-layout");
    const style = document.createElement("style");
    style.textContent = `
      :root{--event-header-reserve:calc(env(safe-area-inset-top) + 64px)}
      body.event-language-layout #root{box-sizing:border-box;padding-top:var(--event-header-reserve)!important}
      #wedding-language-switcher{position:fixed;top:calc(env(safe-area-inset-top) + 12px);right:16px;z-index:2147483647;display:flex;gap:2px;padding:4px;border-radius:999px;background:#fffdf9;border:1px solid #f5ddd4;box-shadow:0 4px 18px #5c2a1e2e}
      #wedding-language-switcher button{border:0;border-radius:999px;padding:8px 10px;font:700 11px/1 Arial,sans-serif;cursor:pointer;min-width:0}
      @media(max-width:650px){:root{--event-header-reserve:calc(env(safe-area-inset-top) + 68px)}}
    `;
    document.head.appendChild(style);
    buttons();
  }
  let timer;
  const pending = new Set();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "childList") record.addedNodes.forEach(node => pending.add(node));
      else pending.add(record.target);
    }
    clearTimeout(timer);
    timer = setTimeout(() => { const roots = [...pending]; pending.clear(); roots.forEach(apply); }, 0);
  });
  // Use the selected application language for browser validation bubbles too.
  function validationMessage(input) {
    const validity = input.validity;
    if (validity.valueMissing) return "Veuillez remplir ce champ.";
    if (validity.typeMismatch && input.type === "email") return "Saisissez une adresse email valide.";
    if (validity.tooShort || validity.tooLong) return "Vérifiez la longueur de ce champ.";
    if (validity.rangeUnderflow || validity.rangeOverflow) return "La valeur saisie est hors des limites autorisées.";
    return "Le format saisi n’est pas valide.";
  }
  document.addEventListener("invalid", event => {
    const input = event.target;
    if (!input.setCustomValidity) return;
    input.setCustomValidity("");
    if (!input.validity.valid) input.setCustomValidity(translate(validationMessage(input)));
  }, true);
  document.addEventListener("input", event => event.target.setCustomValidity?.(""), true);
  function start() {
    installSwitcher(); apply(); titleSource = document.title; titleOutput = translate(titleSource); document.title = titleOutput;
    observer.observe(document.body, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["placeholder","aria-label","title","alt"]});
  }
  window.addEventListener("storage", event => {
    if (event.key === key && codes.includes(event.newValue)) setLanguage(event.newValue, false);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();
