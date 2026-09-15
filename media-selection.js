(() => {
  const STORAGE_KEY = 'wedding-media-selection-v2';
  const MAX_ITEMS = 200;
  const PHOTOS_PER_ZIP = 15;
  const DOWNLOAD_WORKER_VERSION = '20260915-1';
  let downloadWorkerPromise = null;

  const translations = {
    fr: {
      select: 'Sélectionner', selected: 'Sélectionné', items: 'sélectionné(s)',
      downloadSelection: 'Télécharger ma sélection', downloadAll: 'Tout télécharger', clear: 'Effacer',
      empty: 'Sélectionnez au moins une photo ou une vidéo.', limit: 'La sélection est limitée à 200 fichiers.',
      preparing: 'Préparation', downloading: 'Téléchargement', complete: 'Téléchargement terminé.',
      partial: 'Certains fichiers n’ont pas pu être téléchargés.', error: 'Impossible de télécharger. La configuration Firebase Storage doit être actualisée.',
      cancelled: 'Téléchargement annulé.', chooseFolder: 'Choisissez le dossier de destination.',
      videoNotice: 'Vidéos séparées pour conserver la qualité originale.'
    },
    en: {
      select: 'Select', selected: 'Selected', items: 'selected', downloadSelection: 'Download my selection', downloadAll: 'Download all', clear: 'Clear',
      empty: 'Select at least one photo or video.', limit: 'Selection is limited to 200 files.', preparing: 'Preparing',
      downloading: 'Downloading', complete: 'Download complete.', partial: 'Some files must be opened individually.',
      error: 'Unable to download this selection.', cancelled: 'Download cancelled.', chooseFolder: 'Choose the destination folder.',
      videoNotice: 'Videos downloaded separately to preserve original quality.'
    },
    vi: {
      select: 'Chọn', selected: 'Đã chọn', items: 'đã chọn', downloadSelection: 'Tải lựa chọn', downloadAll: 'Tải tất cả', clear: 'Xóa',
      empty: 'Chọn ít nhất một ảnh hoặc video.', limit: 'Tối đa 200 tệp.', preparing: 'Đang chuẩn bị',
      downloading: 'Đang tải', complete: 'Đã tải xong.', partial: 'Một số tệp phải được mở riêng.',
      error: 'Không thể tải lựa chọn.', cancelled: 'Đã hủy tải xuống.', chooseFolder: 'Chọn thư mục đích.',
      videoNotice: 'Video được tải riêng để giữ nguyên chất lượng.'
    }
  };

  const lang = () => ['fr', 'en', 'vi'].includes(localStorage.getItem('mariage-lang')) ? localStorage.getItem('mariage-lang') : 'fr';
  const t = key => translations[lang()][key] || translations.fr[key] || key;
  const itemKey = item => `${item.kind}:${item.id}`;
  const cleanName = (value, fallback) => String(value || fallback).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 120) || fallback;

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
    .ms-bar{position:fixed;z-index:2147483600;left:50%;bottom:18px;transform:translateX(-50%);width:min(96vw,780px);background:#fffdf9;border:1px solid #f5ddd4;border-radius:18px;padding:10px 12px;display:flex;align-items:center;gap:9px;box-shadow:0 8px 35px rgba(61,32,16,.3);font:14px Jost,Arial,sans-serif}
    .ms-bar__info{flex:1;min-width:0}.ms-bar strong{display:block;color:#5c2a1e}.ms-status{display:block;color:#9e7060;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ms-button{border:0;border-radius:999px;padding:10px 15px;font:600 13px Jost,Arial,sans-serif;cursor:pointer}.ms-button:disabled{opacity:.55;cursor:wait}.ms-primary{background:#5c2a1e;color:#fff}.ms-secondary{background:#f5ddd4;color:#5c2a1e}
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

  function visibleItems() {
    const items = new Map();
    document.querySelectorAll('[data-media-kind][data-media-id][data-media-url]').forEach(element => {
      const item = itemFromElement(element); items.set(itemKey(item), item);
    });
    return [...items.values()].slice(0, MAX_ITEMS);
  }

  function renderBar() {
    let bar = document.getElementById('media-selection-bar');
    const available = visibleItems();
    if (!available.length && !selected.size) { bar?.remove(); return; }
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'media-selection-bar'; bar.className = 'ms-bar';
      bar.innerHTML = `<div class="ms-bar__info"><strong data-count></strong><span class="ms-status" data-status aria-live="polite"></span></div><button class="ms-button ms-secondary" data-clear></button><button class="ms-button ms-secondary" data-all></button><button class="ms-button ms-primary" data-download></button>`;
      bar.querySelector('[data-clear]').onclick = () => { if (busy) return; selected.clear(); save(); render(); };
      bar.querySelector('[data-all]').onclick = event => downloadItems(visibleItems(), event.currentTarget, false, true);
      bar.querySelector('[data-download]').onclick = event => downloadSelection(event.currentTarget);
      document.body.appendChild(bar);
    }
    setText(bar.querySelector('[data-count]'), selected.size ? `${selected.size} ${t('items')}` : `${available.length} média(s)`);
    setText(bar.querySelector('[data-clear]'), t('clear'));
    setText(bar.querySelector('[data-all]'), t('downloadAll'));
    setText(bar.querySelector('[data-download]'), t('downloadSelection'));
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
      if (registration.active) return registration.active;

      const worker = registration.installing || registration.waiting;
      if (!worker) throw new Error('Service Worker non initialisé');
      if (worker.state === 'activated') return worker;
      await new Promise((resolve, reject) => {
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

  async function downloadBlob(blob, name) {
    const worker = await getDownloadWorker();
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const safeName = cleanName(name, 'souvenirs');

    await new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => reject(new Error('Préparation du téléchargement trop longue')), 10000);
      channel.port1.onmessage = event => {
        clearTimeout(timeout);
        event.data?.ok ? resolve() : reject(new Error('Téléchargement refusé'));
      };
      worker.postMessage({ type: 'PREPARE_MEDIA_DOWNLOAD', id, name: safeName, blob }, [channel.port2]);
    });

    const anchor = document.createElement('a');
    anchor.href = new URL(`./__download__/${encodeURIComponent(id)}`, window.location.href).href;
    anchor.download = safeName;
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

  async function downloadToDirectory(items, status) {
    setText(status, t('chooseFolder'));
    const selectedDirectory = await window.showDirectoryPicker({ mode: 'readwrite' });
    const directory = await selectedDirectory.getDirectoryHandle('Mariage Huyen et Quentin', { create: true });
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
      if (preferDirectory && typeof window.showDirectoryPicker === 'function') {
        success = await downloadToDirectory(items, status);
      } else {
        if (photos.length) success = await downloadPhotoGroups(photos, status) && success;
        for (let index = 0; index < videos.length; index++) {
          setText(status, `${t('downloading')} ${index + 1}/${videos.length} · ${t('videoNotice')}`);
          success = await downloadDirect(videos[index], index) && success;
        }
      }
      setText(status, success ? t('complete') : t('partial'));
      if (success && clearSelection) { selected.clear(); save(); setTimeout(render, 1800); }
    } catch (error) {
      if (error?.name === 'AbortError') setText(status, t('cancelled'));
      else { console.error('Selection download:', error); setText(status, t('error')); }
    } finally {
      busy = false; render();
    }
  }

  function downloadSelection(button) {
    return downloadItems([...selected.values()], button, true);
  }

  function render() { refreshButtons(); renderBar(); }
  const observer = new MutationObserver(() => requestAnimationFrame(render));
  document.addEventListener('DOMContentLoaded', () => { render(); observer.observe(document.body, { childList: true, subtree: true }); });
  window.addEventListener('wedding:media-rendered', render);
  window.addEventListener('hashchange', render);
})();
