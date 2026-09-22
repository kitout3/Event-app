(() => {
  const EVENT_ID = window.__WEDDING_TENANT__?.eventId || '__unknown_wedding__';
  const STORAGE_KEY = `wedding-media-selection-v2:${EVENT_ID}`;
  const MAX_ITEMS = 200;
  const PHOTOS_PER_ZIP = 15;
  const MOBILE_PHOTOS_PER_BATCH = 15;
  const DOWNLOAD_WORKER_VERSION = '20260922-2';
  let downloadWorkerPromise = null;

  const translations = {
    fr: {
      select: 'Sélectionner', selected: 'Sélectionné', items: 'sélectionné(s)',
      downloadSelection: 'Télécharger ma sélection', downloadAll: 'Tout télécharger', clear: 'Effacer',
      mobileSaveSelection: 'Enregistrer dans Photos', mobileSaveAll: 'Tout enregistrer dans Photos',
      empty: 'Sélectionnez au moins une photo ou une vidéo.', limit: 'La sélection est limitée à 200 fichiers.',
      preparing: 'Préparation', downloading: 'Téléchargement', complete: 'Téléchargement terminé.',
      partial: 'Certains fichiers n’ont pas pu être téléchargés.', error: 'Impossible de télécharger. La configuration Firebase Storage doit être actualisée.',
      cancelled: 'Téléchargement annulé.', chooseFolder: 'Choisissez le dossier de destination.',
      mobileTitle: 'Enregistrer dans Photos', mobilePreparing: 'Préparation du lot',
      mobileReady: 'Lot prêt. Touchez le bouton puis choisissez « Enregistrer dans Photos » dans le menu.',
      mobileSaveBatch: 'Enregistrer ce lot dans Photos', mobileDone: 'Terminé. Les médias sont disponibles dans Photos.',
      mobileRetry: 'Le partage a été fermé. Touchez à nouveau le bouton pour réessayer.', mobileClose: 'Fermer',
      videoNotice: 'Vidéos séparées pour conserver la qualité originale.'
    },
    en: {
      select: 'Select', selected: 'Selected', items: 'selected', downloadSelection: 'Download my selection', downloadAll: 'Download all', clear: 'Clear',
      mobileSaveSelection: 'Save to Photos', mobileSaveAll: 'Save all to Photos',
      empty: 'Select at least one photo or video.', limit: 'Selection is limited to 200 files.', preparing: 'Preparing',
      downloading: 'Downloading', complete: 'Download complete.', partial: 'Some files must be opened individually.',
      error: 'Unable to download this selection.', cancelled: 'Download cancelled.', chooseFolder: 'Choose the destination folder.',
      mobileTitle: 'Save to Photos', mobilePreparing: 'Preparing batch',
      mobileReady: 'Batch ready. Tap the button, then choose “Save to Photos” in the share menu.',
      mobileSaveBatch: 'Save this batch to Photos', mobileDone: 'Done. The media are available in Photos.',
      mobileRetry: 'The share menu was closed. Tap the button again to retry.', mobileClose: 'Close',
      videoNotice: 'Videos downloaded separately to preserve original quality.'
    },
    vi: {
      select: 'Chọn', selected: 'Đã chọn', items: 'đã chọn', downloadSelection: 'Tải lựa chọn', downloadAll: 'Tải tất cả', clear: 'Xóa',
      mobileSaveSelection: 'Lưu vào Ảnh', mobileSaveAll: 'Lưu tất cả vào Ảnh',
      empty: 'Chọn ít nhất một ảnh hoặc video.', limit: 'Tối đa 200 tệp.', preparing: 'Đang chuẩn bị',
      downloading: 'Đang tải', complete: 'Đã tải xong.', partial: 'Một số tệp phải được mở riêng.',
      error: 'Không thể tải lựa chọn.', cancelled: 'Đã hủy tải xuống.', chooseFolder: 'Chọn thư mục đích.',
      mobileTitle: 'Lưu vào Ảnh', mobilePreparing: 'Đang chuẩn bị nhóm',
      mobileReady: 'Nhóm đã sẵn sàng. Nhấn nút rồi chọn lưu vào Ảnh trong menu chia sẻ.',
      mobileSaveBatch: 'Lưu nhóm này vào Ảnh', mobileDone: 'Hoàn tất. Nội dung đã có trong Ảnh.',
      mobileRetry: 'Menu chia sẻ đã đóng. Nhấn lại nút để thử lại.', mobileClose: 'Đóng',
      videoNotice: 'Video được tải riêng để giữ nguyên chất lượng.'
    }
  };

  const lang = () => ['fr', 'en', 'vi'].includes(localStorage.getItem('mariage-lang')) ? localStorage.getItem('mariage-lang') : 'fr';
  const t = key => window.EventI18n?.translate(translations.fr[key]) || translations[lang()][key] || translations.fr[key] || key;
  const itemKey = item => `${item.kind}:${item.id}`;
  const cleanName = (value, fallback) => String(value || fallback).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 120) || fallback;
  const isMobileDevice = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAppleMobile = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const canShareFilesOnMobile = () => isAppleMobile() && typeof navigator.share === 'function'
    && typeof navigator.canShare === 'function' && typeof File === 'function';
  const tr = text => window.EventI18n?.translate(text) || text;

  function downloadError(error) {
    if (error?.name === 'AbortError') return tr('Téléchargement annulé.');
    if (error?.name === 'NotAllowedError' || /partage|sharing/i.test(error?.message || '')) return tr('Le partage est bloqué par ce navigateur. Utilisez les liens de téléchargement.');
    if (error?.code === 'timeout') return tr('Le téléchargement prend trop de temps. Réessayez avec une meilleure connexion.');
    if (error?.code === 'large') return tr('Fichier trop volumineux pour cette méthode. Utilisez le lien du fichier.');
    if ([401,403].includes(error?.status)) return tr('Accès au fichier refusé. Reconnectez-vous à l’événement puis réessayez.');
    if (error?.status === 404) return tr('Ce fichier n’est plus disponible.');
    if (error?.status === 429) return tr('Le serveur reçoit trop de demandes. Réessayez dans quelques instants.');
    return tr('Impossible de récupérer le fichier. Vérifiez votre connexion ou utilisez le lien du fichier.');
  }

  // Bound memory and duration, including response-body reads. Never retry permission errors.
  async function fetchDownloadBlob(item, signal, maxBytes = 64 * 1024 * 1024) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      let timedOut = false;
      const cancel = () => controller.abort();
      signal?.addEventListener('abort', cancel, {once:true});
      if (signal?.aborted) controller.abort();
      const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 45000);
      try {
        const response = await fetch(item.url, {signal:controller.signal,cache:'no-store'});
        if (!response.ok) throw Object.assign(new Error('HTTP ' + response.status), {status:response.status});
        if (Number(response.headers.get('content-length')) > maxBytes) {
          controller.abort(); throw Object.assign(new Error('large'), {code:'large'});
        }
        if (!response.body?.getReader) {
          const blob = await response.blob();
          if (blob.size > maxBytes) throw Object.assign(new Error('large'), {code:'large'});
          return blob;
        }
        const reader = response.body.getReader(), chunks = [];
        let size = 0;
        while (true) {
          const {done,value} = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) {
            await reader.cancel(); throw Object.assign(new Error('large'), {code:'large'});
          }
          chunks.push(value);
        }
        return new Blob(chunks, {type:response.headers.get('content-type') || 'application/octet-stream'});
      } catch (error) {
        if (signal?.aborted) throw Object.assign(new Error('cancelled'), {name:'AbortError'});
        if (timedOut) throw Object.assign(new Error('timeout'), {code:'timeout'});
        if (attempt === 0 && !error.code && (!error.status || error.status >= 500)) continue;
        throw error;
      } finally {
        clearTimeout(timeout); signal?.removeEventListener('abort', cancel);
      }
    }
  }

  function openDownloadPanel(items) {
    document.getElementById('media-download-dialog')?.querySelector('[data-close]')?.click();
    const panel = document.createElement('section');
    panel.id = 'media-download-dialog'; panel.className = 'ms-mobile-overlay';
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true');
    panel.setAttribute('aria-label',tr('Télécharger les fichiers'));
    panel.style.zIndex = '2147483646';
    const box = document.createElement('div'); box.className = 'ms-mobile-dialog';
    Object.assign(box.style,{maxHeight:'80dvh',overflowY:'auto',width:'min(94vw,620px)'});
    panel.appendChild(box);
    const heading = document.createElement('h2'); heading.textContent = tr('Télécharger les fichiers'); box.appendChild(heading);
    const help = document.createElement('p');
    help.textContent = tr('Préparez un fichier ou un lot, puis touchez Télécharger. Les fichiers vont dans Téléchargements. Pour un ZIP, extrayez les photos avec l’application Fichiers.');
    box.appendChild(help);
    const hint = document.createElement('p');
    hint.textContent = tr('Si le navigateur intégré bloque le téléchargement, copiez le lien de l’événement dans Chrome ou Safari. Le lien du fichier reste disponible ci-dessous.');
    box.appendChild(hint);
    const close = document.createElement('button'); close.type = 'button'; close.dataset.close = '';
    close.textContent = t('mobileClose'); close.className = 'ms-mobile-close'; box.appendChild(close);
    const lifetime = new AbortController();
    let active = false, readyLink = null, closed = false;
    const preparations = [];
    const previousFocus = document.activeElement;
    const release = () => {
      if (readyLink) readyLink.remove();
      readyLink = null;
    };
    const onKey = event => {
      if(event.key === 'Escape') { event.preventDefault(); close.click(); }
      if(event.key === 'Tab') {
        const controls = [...box.querySelectorAll('button:not(:disabled),a[href]')];
        const first = controls[0], last = controls[controls.length-1];
        if(event.shiftKey && document.activeElement === first) { event.preventDefault();last?.focus(); }
        else if(!event.shiftKey && document.activeElement === last) { event.preventDefault();first?.focus(); }
      }
    };
    panel.addEventListener('keydown',onKey);
    const dismiss = () => {
      if(closed) return; closed = true; lifetime.abort(); release(); panel.remove();
      window.removeEventListener('hashchange',dismiss); previousFocus?.focus?.();
    };
    close.onclick = dismiss; window.addEventListener('hashchange',dismiss);
    const addTask = (group, label, filename) => {
      const row = document.createElement('div');
      Object.assign(row.style,{borderTop:'1px solid #ddd',padding:'12px 0',display:'grid',gap:'8px'});
      const title = document.createElement('strong'); title.textContent = label; title.translate = false; row.appendChild(title);
      const status = document.createElement('p'); status.setAttribute('role','status'); row.appendChild(status);
      const prepare = document.createElement('button'); prepare.type='button'; prepare.className='ms-mobile-save';
      prepare.textContent=tr('Préparer le téléchargement'); row.appendChild(prepare); preparations.push(prepare);
      for(const item of group) {
        const original = document.createElement('a');
        original.href=item.url; original.target='_blank'; original.rel='noopener noreferrer';
        original.textContent=tr('Ouvrir le fichier original')+' — '+cleanName(item.name,'photo');
        row.appendChild(original);
      }
      prepare.onclick = async () => {
        if(active || closed) return;
        active=true; preparations.forEach(button=>button.disabled=true); release();
        const files=[], failures=[];
        let remaining=64*1024*1024;
        try {
          for(let i=0;i<group.length;i++) {
            status.textContent=t('preparing')+' '+(i+1)+'/'+group.length;
            try {
              const blob=await fetchDownloadBlob(group[i],lifetime.signal,remaining);
              remaining-=blob.size;
              files.push({name:(i+1)+'-'+cleanName(group[i].name,'photo.jpg'),bytes:new Uint8Array(await blob.arrayBuffer()),blob});
            } catch(error) {
              if(lifetime.signal.aborted) throw error;
              failures.push(downloadError(error));
            }
          }
          if(closed) return;
          if(!files.length) { status.textContent=[...new Set(failures)].join(' '); return; }
          const blob=group.length===1?files[0].blob:zipArchive(files);
          const prepared=await prepareDownload(blob,filename);
          if(closed) return;
          const link=document.createElement('a'); readyLink=link;
          link.href=prepared.url;link.download=prepared.name;link.className='ms-mobile-save';
          link.textContent=tr('Télécharger')+' ('+files.length+'/'+group.length+')';
          row.appendChild(link);
          status.textContent=tr('Prêt. Touchez Télécharger ; le navigateur peut demander une confirmation.');
          if(failures.length) status.textContent+=' '+tr('Certains fichiers sont absents du lot. Utilisez leurs liens ou réessayez.')+' '+[...new Set(failures)].join(' ');
          link.onclick=()=>{status.textContent=tr('Téléchargement demandé. Vérifiez les téléchargements de votre navigateur.');};
          link.focus();
        } catch(error) {
          if(!closed) status.textContent=downloadError(error);
        } finally {
          active=false;preparations.forEach(button=>button.disabled=false);
        }
      };
      box.appendChild(row);
    };
    const photos=items.filter(item=>item.kind==='photo');
    if(photos.length>1) {
      for(let i=0;i<photos.length;i+=15) {
        const group=photos.slice(i,i+15);
        addTask(group,tr('Photos')+' '+(i+1)+'–'+(i+group.length), 'photos-'+(i/15+1)+'.zip');
      }
    }
    items.forEach((item,index)=>addTask([item],cleanName(item.name,'souvenir-'+(index+1)),cleanName(item.name,item.kind==='video'?'video.mp4':'photo.jpg')));
    document.body.appendChild(panel); close.focus();
    // A download request is not proof of a saved file. Keep the user's selection.
    return false;
  }

  function loadSelection() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const items = Array.isArray(value) ? value.filter(item =>
        item && ['photo', 'video'].includes(item.kind) && typeof item.id === 'string' && /^https:\/\//.test(item.url)
      ).slice(0, MAX_ITEMS) : [];
      return new Map(items.map(item => [itemKey(item), item]));
    } catch { return new Map(); }
  }

  let selected = loadSelection();
  let busy = false;
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify([...selected.values()]));
  const keyForElement = element => `${element.dataset.mediaKind}:${element.dataset.mediaId}`;
  const itemFromElement = element => ({
    kind: element.dataset.mediaKind,
    id: element.dataset.mediaId,
    url: element.dataset.mediaUrl,
    name: cleanName(element.dataset.mediaName, `${element.dataset.mediaKind}-${element.dataset.mediaId}`),
    size: Number(element.dataset.mediaSize) || null,
  });

  const styles = document.createElement('style');
  styles.id = 'media-selection-styles';
  styles.textContent = `
    [data-media-kind][data-media-id]{position:relative!important}
    .ms-select{position:absolute;z-index:20;top:9px;right:9px;border:1px solid rgba(255,255,255,.8);border-radius:999px;padding:7px 11px;background:rgba(25,18,14,.68);color:#fff;backdrop-filter:blur(10px);font:600 12px Jost,Arial,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.2);cursor:pointer}
    .ms-select[aria-pressed="true"]{background:#5c2a1e;border-color:#f5ddd4}
    .ms-bar{position:fixed;z-index:2147483646;left:50%;bottom:18px;transform:translateX(-50%);width:min(96vw,780px);background:#fffdf9;border:1px solid #f5ddd4;border-radius:18px;padding:10px 12px;display:flex;align-items:center;gap:9px;box-shadow:0 8px 35px rgba(61,32,16,.3);font:14px Jost,Arial,sans-serif}
    .ms-bar__info{flex:1;min-width:0}.ms-bar strong{display:block;color:#5c2a1e}.ms-status{display:block;color:#9e7060;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ms-button{border:0;border-radius:999px;padding:10px 15px;font:600 13px Jost,Arial,sans-serif;cursor:pointer}.ms-button:disabled{opacity:.55;cursor:wait}.ms-primary{background:#5c2a1e;color:#fff}.ms-secondary{background:#f5ddd4;color:#5c2a1e}
    .ms-mobile-overlay{position:fixed;inset:0;z-index:2147483646;background:rgba(25,18,14,.72);display:flex;align-items:flex-end;justify-content:center;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom));font-family:Jost,Arial,sans-serif}
    .ms-mobile-dialog{width:min(100%,560px);background:#fffdf9;border-radius:22px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.35);display:grid;gap:13px;color:#5c2a1e}
    .ms-mobile-dialog h2{margin:0;font:500 1.65rem 'Cormorant Garamond',Georgia,serif}.ms-mobile-dialog p{margin:0;color:#7f6255;font-size:.9rem;line-height:1.45}
    .ms-mobile-progress{height:7px;border-radius:99px;background:#f5ddd4;overflow:hidden}.ms-mobile-progress span{display:block;height:100%;width:0;background:#5c2a1e;transition:width .25s ease}
    .ms-mobile-actions{display:grid;grid-template-columns:1fr auto;gap:9px}.ms-mobile-save{border:0;border-radius:999px;padding:13px 16px;background:#5c2a1e;color:white;font:600 14px Jost,Arial,sans-serif}.ms-mobile-save:disabled{opacity:.48}
    .ms-mobile-close{border:0;border-radius:999px;padding:13px 16px;background:#f5ddd4;color:#5c2a1e;font:600 14px Jost,Arial,sans-serif}
    @media(max-width:650px){.ms-select{padding:7px;width:36px;height:36px;font-size:0}.ms-select::before{content:'+';font-size:20px}.ms-select[aria-pressed="true"]::before{content:'✓';font-size:18px}.ms-bar{bottom:8px;display:grid;grid-template-columns:1fr 1fr;padding:9px}.ms-bar__info{grid-column:1/-1}.ms-button{padding:10px 8px;font-size:12px}.ms-bar [data-clear]{display:none}.ms-status{white-space:normal}.ms-bar strong{font-size:12px}}
  `;
  document.head.appendChild(styles);

  function refreshButtons() {
    document.querySelectorAll('[data-media-kind][data-media-id][data-media-url]').forEach(element => {
      let button = element.querySelector(':scope > .ms-select');
      if (!button) {
        button = document.createElement('button'); button.type = 'button'; button.className = 'ms-select';
        button.addEventListener('click', event => {
          event.preventDefault(); event.stopPropagation();
          const key = keyForElement(element);
          if (selected.has(key)) selected.delete(key);
          else if (selected.size >= MAX_ITEMS) return window.alert(t('limit'));
          else selected.set(key, itemFromElement(element));
          save(); render();
        });
        element.appendChild(button);
      }
      const active = selected.has(keyForElement(element));
      button.setAttribute('aria-pressed', String(active));
      const label = active ? `✓ ${t('selected')}` : `+ ${t('select')}`;
      if (button.textContent !== label) button.textContent = label;
      button.setAttribute('aria-label', label);
    });
  }

  function setText(element, value) { if (element && element.textContent !== value) element.textContent = value; }

  function isActuallyVisible(element) {
    if (!element?.isConnected) return false;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    return element.getClientRects().length > 0;
  }

  function activeMediaRoot() {
    const videoOverlay = document.querySelector('#vt-overlay .vt-gallery-grid')?.closest('#vt-overlay');
    if (videoOverlay) return videoOverlay;
    return document;
  }

  function visibleItems(root = activeMediaRoot()) {
    const items = new Map();
    root.querySelectorAll('[data-media-kind][data-media-id][data-media-url]').forEach(element => {
      if (!isActuallyVisible(element)) return;
      const item = itemFromElement(element); items.set(itemKey(item), item);
    });
    return [...items.values()].slice(0, MAX_ITEMS);
  }

  function renderBar() {
    let bar = document.getElementById('media-selection-bar');
    const root = activeMediaRoot();
    const available = visibleItems(root);
    if (!available.length) { bar?.remove(); return; }
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'media-selection-bar'; bar.className = 'ms-bar';
      bar.innerHTML = `<div class="ms-bar__info"><strong data-count></strong><span class="ms-status" data-status aria-live="polite"></span></div><button class="ms-button ms-secondary" data-clear></button><button class="ms-button ms-secondary" data-all></button><button class="ms-button ms-primary" data-download></button>`;
      bar.querySelector('[data-clear]').onclick = () => { if (busy) return; selected.clear(); save(); render(); };
      bar.querySelector('[data-all]').onclick = event => downloadItems(visibleItems(activeMediaRoot()), event.currentTarget, false, true);
      bar.querySelector('[data-download]').onclick = event => downloadSelection(event.currentTarget);
      (root.id === 'vt-overlay' ? root : document.body).appendChild(bar);
    } else {
      const expectedParent = root.id === 'vt-overlay' ? root : document.body;
      if (bar.parentElement !== expectedParent) expectedParent.appendChild(bar);
    }
    setText(bar.querySelector('[data-count]'), selected.size ? `${selected.size} ${t('items')}` : `${available.length} média(s)`);
    setText(bar.querySelector('[data-clear]'), t('clear'));
    setText(bar.querySelector('[data-all]'), t(canShareFilesOnMobile() ? 'mobileSaveAll' : 'downloadAll'));
    setText(bar.querySelector('[data-download]'), t(canShareFilesOnMobile() ? 'mobileSaveSelection' : 'downloadSelection'));
    bar.querySelector('[data-clear]').disabled = busy || !selected.size;
    bar.querySelector('[data-download]').disabled = busy || !selected.size;
  }

  async function getDownloadWorker() {
    if (!('serviceWorker' in navigator)) throw new Error('Service Worker indisponible');
    if (downloadWorkerPromise) return downloadWorkerPromise;

    downloadWorkerPromise = (async () => {
      const workerUrl = new URL(`./download-worker.js?v=${DOWNLOAD_WORKER_VERSION}`, window.location.href);
      const scope = new URL('./__download__/', window.location.href).pathname;
      const registration = await navigator.serviceWorker.register(workerUrl, { scope });
      await registration.update();
      const worker = registration.installing || registration.waiting || registration.active;
      if (!worker) throw new Error('Service Worker non initialisé');
      if (worker.state !== 'activated') await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Activation du téléchargement trop longue')), 10000);
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') { clearTimeout(timeout); resolve(); }
            if (worker.state === 'redundant') { clearTimeout(timeout); reject(new Error('Activation du téléchargement refusée')); }
          });
        });
      if (!registration.active) throw new Error('Service Worker non actif');
      return registration.active;
    })().catch(error => {
      downloadWorkerPromise = null;
      throw error;
    });

    return downloadWorkerPromise;
  }

  async function prepareDownload(blob, name) {
    const worker = await getDownloadWorker();
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const safeName = cleanName(name, 'souvenirs');

    await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => reject(new Error('Préparation du téléchargement trop longue')), 10000);
      channel.port1.onmessage = event => {
        clearTimeout(timeout);
        event.data?.ok ? resolve() : reject(new Error(event.data?.error || 'Téléchargement refusé'));
      };
      worker.postMessage({ type: 'PREPARE_MEDIA_DOWNLOAD', id, name: safeName, blob }, [channel.port2]);
    });

    return {
      name: safeName,
      url: new URL(`./__download__/${encodeURIComponent(id)}`, window.location.href).href,
    };
  }

  async function downloadBlob(blob, name) {
    const prepared = await prepareDownload(blob, name);

    const anchor = document.createElement('a');
    anchor.href = prepared.url;
    anchor.download = prepared.name;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => anchor.remove(), 60000);
  }

  async function fetchMedia(item) {
    const response = await fetch(item.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  function mobileShareBatches(items) {
    const batches = [];
    let photos = [];
    const flushPhotos = () => {
      if (photos.length) batches.push(photos);
      photos = [];
    };

    items.forEach(item => {
      if (item.kind === 'video') {
        flushPhotos();
        batches.push([item]);
        return;
      }
      photos.push(item);
      if (photos.length >= MOBILE_PHOTOS_PER_BATCH) flushPhotos();
    });
    flushPhotos();
    return batches;
  }

  async function mediaFile(item, index, signal) {
    const blob = await fetchDownloadBlob(item, signal);
    const fallbackExtension = item.kind === 'video' ? 'mp4' : 'jpg';
    let filename = cleanName(item.name, `${item.kind}-${item.id || index + 1}.${fallbackExtension}`);
    if (!/\.[a-z0-9]{2,5}$/i.test(filename)) filename += `.${fallbackExtension}`;
    const type = blob.type || (item.kind === 'video' ? 'video/mp4' : 'image/jpeg');
    return new File([blob], filename, { type, lastModified: Date.now() });
  }

  async function shareItemsToPhotos(items, status) {
    if (!canShareFilesOnMobile()) throw new Error('Partage de fichiers indisponible');
    const batches = mobileShareBatches(items);
    if (!batches.length) return false;

    const overlay = document.createElement('section');
    overlay.className = 'ms-mobile-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="ms-mobile-dialog">
        <h2>${t('mobileTitle')}</h2>
        <p data-mobile-status></p>
        <div class="ms-mobile-progress"><span data-mobile-progress></span></div>
        <div class="ms-mobile-actions">
          <button type="button" class="ms-mobile-save" data-mobile-save disabled></button>
          <button type="button" class="ms-mobile-close" data-mobile-close>${t('mobileClose')}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const message = overlay.querySelector('[data-mobile-status]');
    const progress = overlay.querySelector('[data-mobile-progress]');
    const saveButton = overlay.querySelector('[data-mobile-save]');
    const closeButton = overlay.querySelector('[data-mobile-close]');

    return new Promise((resolve, reject) => {
      const lifetime = new AbortController();
      let batchIndex = 0;
      let preparedFiles = [];
      let closed = false;

      const abort = () => {
        if (closed) return;
        closed = true;
        lifetime.abort();
        overlay.remove();
        const error = new Error(t('cancelled'));
        error.name = 'AbortError';
        reject(error);
      };

      const fail = error => {
        if (closed) return;
        closed = true;
        lifetime.abort();
        overlay.remove();
        reject(error);
      };

      const prepare = async () => {
        const batch = batches[batchIndex];
        preparedFiles = [];
        saveButton.disabled = true;
        saveButton.textContent = `${t('mobileSaveBatch')} (${batchIndex + 1}/${batches.length})`;
        setText(status, `${t('mobilePreparing')} ${batchIndex + 1}/${batches.length}`);

        try {
          for (let index = 0; index < batch.length; index++) {
            message.textContent = `${t('mobilePreparing')} ${batchIndex + 1}/${batches.length} · ${index + 1}/${batch.length}`;
            preparedFiles.push(await mediaFile(batch[index], index, lifetime.signal));
            if (closed) return;
            if (preparedFiles.reduce((size,file) => size + file.size, 0) > 64 * 1024 * 1024) {
              throw Object.assign(new Error('large'), {code:'large'});
            }
            const completed = (batchIndex + ((index + 1) / batch.length)) / batches.length;
            progress.style.width = `${Math.round(completed * 100)}%`;
          }
          if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: preparedFiles })) {
            throw new Error('Le partage de ces fichiers n’est pas pris en charge par ce navigateur.');
          }
          message.textContent = t('mobileReady');
          saveButton.disabled = false;
        } catch (error) {
          fail(error);
        }
      };

      closeButton.onclick = abort;
      saveButton.onclick = async () => {
        if (!preparedFiles.length || closed) return;
        try {
          await navigator.share({ files: preparedFiles, title: window.__WEDDING_EVENT__?.name || 'Événement' });
        } catch (error) {
          if (error?.name === 'AbortError') {
            message.textContent = t('mobileRetry');
            return;
          }
          fail(error);
          return;
        }

        batchIndex += 1;
        preparedFiles = [];
        if (batchIndex < batches.length) {
          await prepare();
          return;
        }

        message.textContent = t('mobileDone');
        progress.style.width = '100%';
        saveButton.disabled = true;
        setTimeout(() => {
          if (closed) return;
          closed = true;
          overlay.remove();
          resolve(true);
        }, 1200);
      };

      prepare();
    });
  }

  async function hasNativeDownload(item) {
    try {
      const response = await fetch(item.url, { method: 'HEAD', cache: 'no-store' });
      return response.ok && /^attachment(?:;|$)/i.test(response.headers.get('content-disposition') || '');
    } catch {
      return false;
    }
  }

  function downloadNative(item, index) {
    const anchor = document.createElement('a');
    anchor.href = item.url;
    anchor.download = cleanName(item.name, `souvenir-${index + 1}`);
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => anchor.remove(), 60000);
  }

  async function downloadToDirectory(items, status) {
    setText(status, t('chooseFolder'));
    const selectedDirectory = await window.showDirectoryPicker({ mode: 'readwrite' });
    const eventFolder = cleanName(window.__WEDDING_EVENT__?.name || 'Evenement', 'Evenement');
      const directory = await selectedDirectory.getDirectoryHandle(eventFolder, { create: true });
    const usedNames = new Set();

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const baseName = cleanName(item.name, `souvenir-${index + 1}`);
      let filename = baseName;
      let duplicate = 2;
      while (usedNames.has(filename.toLocaleLowerCase())) {
        const dot = baseName.lastIndexOf('.');
        const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
        const extension = dot > 0 ? baseName.slice(dot) : '';
        filename = `${stem}-${duplicate++}${extension}`;
      }
      usedNames.add(filename.toLocaleLowerCase());

      setText(status, `${t('downloading')} ${index + 1}/${items.length}`);
      const response = await fetch(item.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const fileHandle = await directory.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      try {
        if (response.body?.pipeTo) await response.body.pipeTo(writable);
        else {
          await writable.write(await response.arrayBuffer());
          await writable.close();
        }
      } catch (error) {
        try { await writable.abort(); } catch { /* écriture déjà fermée */ }
        throw error;
      }
    }
    return true;
  }

  async function downloadWithFilePicker(item, index = 0) {
    if (typeof window.showSaveFilePicker !== 'function') return downloadDirect(item, index);
    const filename = cleanName(item.name, `souvenir-${index + 1}`);
    const fileHandle = await window.showSaveFilePicker({ suggestedName: filename });
    const response = await fetch(item.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const writable = await fileHandle.createWritable();
    try {
      if (response.body?.pipeTo) await response.body.pipeTo(writable);
      else {
        await writable.write(await response.arrayBuffer());
        await writable.close();
      }
    } catch (error) {
      try { await writable.abort(); } catch { /* écriture déjà fermée */ }
      throw error;
    }
    return true;
  }

  const crcTable = Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    return crc >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function littleEndian(value, length) {
    const bytes = new Uint8Array(length), view = new DataView(bytes.buffer);
    if (length === 2) view.setUint16(0, value, true); else view.setUint32(0, value, true);
    return bytes;
  }
  function joinBytes(parts) {
    const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0; parts.forEach(part => { result.set(part, offset); offset += part.length; }); return result;
  }
  function zipArchive(files) {
    const encoder = new TextEncoder(), localParts = [], centralParts = [];
    let offset = 0;
    files.forEach((file, index) => {
      const name = encoder.encode(cleanName(file.name, `photo-${index + 1}.jpg`));
      const checksum = crc32(file.bytes), size = file.bytes.length;
      const local = joinBytes([littleEndian(0x04034b50, 4), littleEndian(20, 2), littleEndian(0x0800, 2), littleEndian(0, 2), littleEndian(0, 2), littleEndian(0, 2), littleEndian(checksum, 4), littleEndian(size, 4), littleEndian(size, 4), littleEndian(name.length, 2), littleEndian(0, 2), name]);
      const central = joinBytes([littleEndian(0x02014b50, 4), littleEndian(20, 2), littleEndian(20, 2), littleEndian(0x0800, 2), littleEndian(0, 2), littleEndian(0, 2), littleEndian(0, 2), littleEndian(checksum, 4), littleEndian(size, 4), littleEndian(size, 4), littleEndian(name.length, 2), littleEndian(0, 2), littleEndian(0, 2), littleEndian(0, 2), littleEndian(0, 2), littleEndian(0, 4), littleEndian(offset, 4), name]);
      localParts.push(local, file.bytes); centralParts.push(central); offset += local.length + size;
    });
    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const end = joinBytes([littleEndian(0x06054b50, 4), littleEndian(0, 2), littleEndian(0, 2), littleEndian(files.length, 2), littleEndian(files.length, 2), littleEndian(centralSize, 4), littleEndian(offset, 4), littleEndian(0, 2)]);
    return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
  }

  async function downloadDirect(item, index) {
    try {
      if (await hasNativeDownload(item)) {
        downloadNative(item, index);
        return true;
      }
      const bytes = await fetchMedia(item);
      await downloadBlob(new Blob([bytes]), item.name || `souvenir-${index + 1}`);
      return true;
    } catch (error) {
      console.error('Direct media download:', error);
      return false;
    }
  }

  async function downloadPhotoGroups(photos, status) {
    if (photos.length === 1) return downloadDirect(photos[0], 0);
    if (await hasNativeDownload(photos[0])) {
      for (let index = 0; index < photos.length; index++) {
        setText(status, `${t('downloading')} ${index + 1}/${photos.length}`);
        downloadNative(photos[index], index);
        await new Promise(resolve => setTimeout(resolve, 350));
      }
      return true;
    }
    const groups = [];
    for (let index = 0; index < photos.length; index += PHOTOS_PER_ZIP) groups.push(photos.slice(index, index + PHOTOS_PER_ZIP));
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const files = [];
      for (let index = 0; index < groups[groupIndex].length; index++) {
        const completed = groupIndex * PHOTOS_PER_ZIP + index + 1;
        setText(status, `${t('preparing')} ${completed}/${photos.length}`);
        const item = groups[groupIndex][index]; files.push({ name: item.name, bytes: await fetchMedia(item) });
      }
      const suffix = groups.length > 1 ? `-partie-${groupIndex + 1}` : '';
      await downloadBlob(zipArchive(files), `mariage-huyen-quentin-photos${suffix}.zip`);
    }
    return true;
  }

  async function downloadItems(items, button, clearSelection, preferDirectory = false) {
    if (busy || !items.length) return;
    busy = true; button.disabled = true;
    const bar = document.getElementById('media-selection-bar'), status = bar?.querySelector('[data-status]');
    bar?.querySelectorAll('button').forEach(item => { item.disabled = true; });
    const photos = items.filter(item => item.kind === 'photo'), videos = items.filter(item => item.kind === 'video');
    let success = true;
    try {
      if (canShareFilesOnMobile()) {
        try { success = await shareItemsToPhotos(items, status); }
        catch(error) {
          if(error?.name === 'AbortError') throw error;
          setText(status,downloadError(error)); openDownloadPanel(items); return;
        }
      } else if (!isMobileDevice() && (typeof window.showSaveFilePicker === 'function' || typeof window.showDirectoryPicker === 'function')) {
        try {
          if(items.length===1 && typeof window.showSaveFilePicker === 'function') success=await downloadWithFilePicker(items[0],0);
          else if(typeof window.showDirectoryPicker === 'function') success=await downloadToDirectory(items,status);
          else { openDownloadPanel(items);return; }
        } catch(error) {
          if(error?.name==='AbortError') throw error;
          setText(status,downloadError(error));openDownloadPanel(items);return;
        }
      } else {
        openDownloadPanel(items); return;
      }
      setText(status, success ? t('complete') : t('partial'));
      if (success && clearSelection) { selected.clear(); save(); setTimeout(render, 1800); }
    } catch (error) {
      if (error?.name === 'AbortError') setText(status, t('cancelled'));
      else { console.error('Selection download:', error); setText(status, downloadError(error)); }
    } finally {
      busy = false; render();
    }
  }

  function downloadSelection(button) {
    return downloadItems([...selected.values()], button, true);
  }

  window.weddingDownloadMedia = item => {
    const normalized = {
      kind: item?.kind || 'video',
      id: String(item?.id || 'media'),
      url: String(item?.url || ''),
      name: cleanName(item?.name, 'souvenir'),
    };
    return canShareFilesOnMobile()
      ? shareItemsToPhotos([normalized], null).catch(error => {
        if(error?.name === 'AbortError') throw error;
        return openDownloadPanel([normalized]);
      })
      : Promise.resolve(openDownloadPanel([normalized]));
  };

  function render() {
    refreshButtons();
    renderBar();
  }
  let renderPending = false;
  const scheduleRender = () => {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => { renderPending = false; render(); });
  };
  const observer = new MutationObserver(scheduleRender);
  const start = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    render();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
  window.addEventListener('wedding:media-rendered', render);
  window.addEventListener('hashchange', () => {
    document.getElementById('media-selection-bar')?.remove();
    requestAnimationFrame(render);
  });
})();
