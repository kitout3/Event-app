(() => {
  const STORAGE_KEY = 'wedding-media-selection-v1';
  const API_REGION = 'europe-west1';
  const MAX_ITEMS = 200;

  const translations = {
    fr: {
      select: 'Sélectionner', selected: 'Sélectionné', items: 'sélectionné(s)',
      receive: 'Recevoir ma sélection', clear: 'Tout effacer', title: 'Recevoir ma sélection',
      intro: 'Saisissez votre adresse e-mail. Aucun compte ni confirmation ne sont nécessaires.',
      email: 'Votre adresse e-mail', send: 'Envoyer le lien', cancel: 'Annuler', sending: 'Envoi en cours…',
      sent: 'Le lien de téléchargement a été envoyé.', invalid: 'Saisissez une adresse e-mail valide.',
      empty: 'Sélectionnez au moins une photo ou une vidéo.', limit: 'La sélection est limitée à 200 fichiers.',
      error: "L'envoi a échoué. Réessayez dans quelques instants.", downloadTitle: 'Votre sélection',
      downloadIntro: 'Les fichiers sont fournis dans leur meilleure qualité disponible.', downloadAll: 'Tout télécharger',
      download: 'Télécharger', loading: 'Chargement de la sélection…', expired: "Ce lien n'est plus disponible.",
      progress: 'Téléchargement', done: 'Téléchargement terminé.', back: "Retour à l'accueil",
      photo: 'Photo', video: 'Vidéo'
    },
    en: {
      select: 'Select', selected: 'Selected', items: 'selected', receive: 'Email my selection', clear: 'Clear all',
      title: 'Email my selection', intro: 'Enter your email address. No account or confirmation is required.',
      email: 'Your email address', send: 'Send download link', cancel: 'Cancel', sending: 'Sending…',
      sent: 'The download link has been sent.', invalid: 'Enter a valid email address.', empty: 'Select at least one photo or video.',
      limit: 'Selection is limited to 200 files.', error: 'Unable to send. Please try again shortly.', downloadTitle: 'Your selection',
      downloadIntro: 'Files are provided in the best available quality.', downloadAll: 'Download all', download: 'Download',
      loading: 'Loading selection…', expired: 'This link is no longer available.', progress: 'Downloading', done: 'Download complete.',
      back: 'Back to home', photo: 'Photo', video: 'Video'
    },
    vi: {
      select: 'Chọn', selected: 'Đã chọn', items: 'đã chọn', receive: 'Gửi lựa chọn qua email', clear: 'Xóa tất cả',
      title: 'Nhận lựa chọn', intro: 'Nhập email của bạn. Không cần tạo tài khoản hay xác nhận.',
      email: 'Địa chỉ email', send: 'Gửi liên kết', cancel: 'Hủy', sending: 'Đang gửi…', sent: 'Đã gửi liên kết tải xuống.',
      invalid: 'Nhập địa chỉ email hợp lệ.', empty: 'Chọn ít nhất một ảnh hoặc video.', limit: 'Tối đa 200 tệp.',
      error: 'Không thể gửi. Vui lòng thử lại.', downloadTitle: 'Lựa chọn của bạn', downloadIntro: 'Tệp ở chất lượng tốt nhất hiện có.',
      downloadAll: 'Tải tất cả', download: 'Tải xuống', loading: 'Đang tải…', expired: 'Liên kết này không còn khả dụng.',
      progress: 'Đang tải', done: 'Đã tải xong.', back: 'Về trang chủ', photo: 'Ảnh', video: 'Video'
    }
  };

  const lang = () => ['fr', 'en', 'vi'].includes(localStorage.getItem('mariage-lang')) ? localStorage.getItem('mariage-lang') : 'fr';
  const t = key => translations[lang()][key] || translations.fr[key] || key;
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

  function loadSelection() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(value) ? value.filter(key => /^(photo|video):.+/.test(key)).slice(0, MAX_ITEMS) : []);
    } catch { return new Set(); }
  }

  let selected = loadSelection();
  const keyFor = element => `${element.dataset.mediaKind}:${element.dataset.mediaId}`;
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected]));

  const styles = document.createElement('style');
  styles.id = 'media-selection-styles';
  styles.textContent = `
    [data-media-kind][data-media-id]{position:relative!important}
    .ms-select{position:absolute;z-index:20;top:9px;right:9px;border:1px solid rgba(255,255,255,.8);border-radius:999px;padding:7px 11px;background:rgba(25,18,14,.68);color:#fff;backdrop-filter:blur(10px);font:600 12px Jost,Arial,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.2);cursor:pointer}
    .ms-select[aria-pressed="true"]{background:#5c2a1e;border-color:#f5ddd4}
    .ms-bar{position:fixed;z-index:2147483600;left:50%;bottom:18px;transform:translateX(-50%);width:min(94vw,650px);background:#fffdf9;border:1px solid #f5ddd4;border-radius:18px;padding:10px 12px;display:flex;align-items:center;gap:9px;box-shadow:0 8px 35px rgba(61,32,16,.3);font:14px Jost,Arial,sans-serif}
    .ms-bar strong{color:#5c2a1e;flex:1}.ms-button{border:0;border-radius:999px;padding:10px 15px;font:600 13px Jost,Arial,sans-serif;cursor:pointer}.ms-primary{background:#5c2a1e;color:#fff}.ms-secondary{background:#f5ddd4;color:#5c2a1e}
    .ms-overlay{position:fixed;z-index:2147483646;inset:0;background:rgba(20,10,6,.72);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Jost,Arial,sans-serif;overflow:auto}
    .ms-dialog{width:min(100%,520px);background:#fffdf9;border-radius:22px;padding:24px;box-shadow:0 18px 70px rgba(0,0,0,.38);color:#3d2010}.ms-dialog h2{font:500 30px 'Cormorant Garamond',serif;color:#5c2a1e;margin:0 0 8px}.ms-dialog p{color:#9e7060;margin:0 0 16px;line-height:1.45}.ms-dialog input{width:100%;border:1.5px solid #e8c9bd;border-radius:12px;padding:13px 14px;font:16px Jost,Arial,sans-serif}.ms-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;flex-wrap:wrap}.ms-status{min-height:20px;margin-top:10px!important;color:#a93226!important;font-size:13px}
    .ms-download{position:fixed;z-index:2147483645;inset:0;background:linear-gradient(160deg,#fdf8f4,#f5ddd4);overflow:auto;padding:24px 16px;font-family:Jost,Arial,sans-serif;color:#3d2010}.ms-download__shell{max-width:900px;margin:auto}.ms-download__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:18px 0}.ms-download__item{background:#fffdf9;border:1px solid #e8c9bd;border-radius:15px;padding:14px;display:flex;align-items:center;gap:10px}.ms-download__icon{font-size:28px}.ms-download__item div{flex:1;min-width:0}.ms-download__item strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.ms-download__item small{color:#9e7060}.ms-download__item a{text-decoration:none}
    @media(max-width:520px){.ms-select{padding:7px;width:36px;height:36px;font-size:0}.ms-select::before{content:'+';font-size:20px}.ms-select[aria-pressed="true"]::before{content:'✓';font-size:18px}.ms-bar{bottom:10px}.ms-bar .ms-secondary{display:none}.ms-dialog{padding:20px}.ms-download{padding:18px 12px}.ms-download__grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(styles);

  function apiUrl(name) {
    const projectId = window.__FIREBASE_CONFIG__?.projectId;
    if (!projectId) throw new Error('Firebase config missing');
    return `https://${API_REGION}-${projectId}.cloudfunctions.net/${name}`;
  }

  function refreshButtons() {
    document.querySelectorAll('[data-media-kind][data-media-id]').forEach(element => {
      let button = element.querySelector(':scope > .ms-select');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'ms-select';
        button.addEventListener('click', event => {
          event.preventDefault(); event.stopPropagation();
          const key = keyFor(element);
          if (selected.has(key)) selected.delete(key);
          else if (selected.size >= MAX_ITEMS) return window.alert(t('limit'));
          else selected.add(key);
          save(); render();
        });
        element.appendChild(button);
      }
      const active = selected.has(keyFor(element));
      button.setAttribute('aria-pressed', String(active));
      const label = active ? `✓ ${t('selected')}` : `+ ${t('select')}`;
      if (button.textContent !== label) button.textContent = label;
      button.setAttribute('aria-label', label);
    });
  }

  function closeModal() { document.getElementById('media-selection-modal')?.remove(); }

  function openEmailModal() {
    if (!selected.size) return window.alert(t('empty'));
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'media-selection-modal'; overlay.className = 'ms-overlay';
    overlay.innerHTML = `<form class="ms-dialog"><h2>${t('title')}</h2><p>${t('intro')}</p><label><span style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">${t('email')}</span><input name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" required placeholder="nom@exemple.com"></label><p class="ms-status" aria-live="polite"></p><div class="ms-actions"><button type="button" class="ms-button ms-secondary" data-cancel>${t('cancel')}</button><button type="submit" class="ms-button ms-primary">${t('send')}</button></div></form>`;
    document.body.appendChild(overlay);
    const form = overlay.querySelector('form'), email = form.elements.email, status = overlay.querySelector('.ms-status'), submit = form.querySelector('[type="submit"]');
    overlay.querySelector('[data-cancel]').onclick = closeModal;
    overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!email.validity.valid) { status.textContent = t('invalid'); email.focus(); return; }
      submit.disabled = true; submit.textContent = t('sending'); status.textContent = '';
      const items = [...selected].map(key => { const separator = key.indexOf(':'); return { kind: key.slice(0, separator), id: key.slice(separator + 1) }; });
      try {
        const response = await fetch(apiUrl('createMediaSelection'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.value.trim(), items }) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        selected.clear(); save(); render();
        form.innerHTML = `<div style="text-align:center;font-size:46px">✅</div><h2 style="text-align:center">${t('sent')}</h2><div class="ms-actions" style="justify-content:center"><button type="button" class="ms-button ms-primary" data-close>${t('cancel')}</button></div>`;
        form.querySelector('[data-close]').onclick = closeModal;
      } catch (error) {
        console.error('Media selection:', error); status.textContent = t('error'); submit.disabled = false; submit.textContent = t('send');
      }
    });
    setTimeout(() => email.focus(), 30);
  }

  function renderBar() {
    let bar = document.getElementById('media-selection-bar');
    if (!selected.size || location.hash.startsWith('#selection=')) { bar?.remove(); return; }
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'media-selection-bar'; bar.className = 'ms-bar';
      bar.innerHTML = `<strong data-count></strong><button class="ms-button ms-secondary" data-clear></button><button class="ms-button ms-primary" data-email></button>`;
      bar.querySelector('[data-clear]').onclick = () => { selected.clear(); save(); render(); };
      bar.querySelector('[data-email]').onclick = openEmailModal;
      document.body.appendChild(bar);
    }
    const values = [[bar.querySelector('[data-count]'), `${selected.size} ${t('items')}`], [bar.querySelector('[data-clear]'), t('clear')], [bar.querySelector('[data-email]'), t('receive')]];
    values.forEach(([element, value]) => { if (element.textContent !== value) element.textContent = value; });
  }

  async function downloadItem(item, index) {
    try {
      const response = await fetch(item.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const href = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = href; anchor.download = item.name || `souvenir-${index + 1}`; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(href), 30000);
    } catch {
      window.open(item.url, '_blank', 'noopener');
    }
  }

  async function showDownloadPage(token) {
    document.getElementById('media-selection-download')?.remove();
    const page = document.createElement('main'); page.id = 'media-selection-download'; page.className = 'ms-download';
    page.innerHTML = `<div class="ms-download__shell"><button class="ms-button ms-secondary" data-back>← ${t('back')}</button><div style="text-align:center;padding:50px 10px"><h1 style="font:500 38px 'Cormorant Garamond',serif;color:#5c2a1e">${t('downloadTitle')}</h1><p data-state>${t('loading')}</p></div></div>`;
    document.body.appendChild(page);
    page.querySelector('[data-back]').onclick = () => { history.replaceState(null, '', location.pathname + location.search); page.remove(); };
    try {
      const response = await fetch(`${apiUrl('getMediaSelection')}?token=${encodeURIComponent(token)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json(), items = Array.isArray(data.items) ? data.items : [];
      const shell = page.querySelector('.ms-download__shell');
      shell.innerHTML = `<button class="ms-button ms-secondary" data-back>← ${t('back')}</button><div style="text-align:center;margin:24px 0"><h1 style="font:500 42px 'Cormorant Garamond',serif;color:#5c2a1e;margin-bottom:8px">${t('downloadTitle')}</h1><p style="color:#9e7060">${t('downloadIntro')}</p><button class="ms-button ms-primary" data-all>⬇ ${t('downloadAll')} (${items.length})</button><p data-progress style="min-height:20px;color:#9e7060;font-size:13px;margin-top:10px"></p></div><div class="ms-download__grid"></div>`;
      shell.querySelector('[data-back]').onclick = () => { history.replaceState(null, '', location.pathname + location.search); page.remove(); };
      const grid = shell.querySelector('.ms-download__grid');
      items.forEach((item, index) => {
        const card = document.createElement('article'); card.className = 'ms-download__item';
        card.innerHTML = `<span class="ms-download__icon">${item.kind === 'video' ? '🎥' : '🖼️'}</span><div><strong>${escapeHtml(item.name)}</strong><small>${t(item.kind === 'video' ? 'video' : 'photo')}${item.size ? ` · ${Math.max(1, Math.round(item.size / 1048576))} Mo` : ''}</small></div><button class="ms-button ms-secondary">⬇ ${t('download')}</button>`;
        card.querySelector('button').onclick = () => downloadItem(item, index); grid.appendChild(card);
      });
      shell.querySelector('[data-all]').onclick = async event => {
        const button = event.currentTarget, progress = shell.querySelector('[data-progress]'); button.disabled = true;
        for (let index = 0; index < items.length; index++) { progress.textContent = `${t('progress')} ${index + 1}/${items.length}`; await downloadItem(items[index], index); }
        progress.textContent = t('done'); button.disabled = false;
      };
    } catch (error) {
      console.error('Download selection:', error); page.querySelector('[data-state]').textContent = t('expired');
    }
  }

  function render() { refreshButtons(); renderBar(); }
  const selectionToken = new URLSearchParams(location.hash.slice(1)).get('selection');
  if (selectionToken) showDownloadPage(selectionToken);
  const observer = new MutationObserver(() => requestAnimationFrame(render));
  document.addEventListener('DOMContentLoaded', () => { render(); observer.observe(document.body, { childList: true, subtree: true }); });
  window.addEventListener('wedding:media-rendered', render);
  window.addEventListener('hashchange', () => {
    const token = new URLSearchParams(location.hash.slice(1)).get('selection');
    if (token) showDownloadPage(token); else document.getElementById('media-selection-download')?.remove();
    render();
  });
})();
