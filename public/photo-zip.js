(() => {
  'use strict';
  const encoder = new TextEncoder();
  const crcTable = Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : crc >>> 1;
    return crc >>> 0;
  });
  const number = (value, size) => {
    const bytes = new Uint8Array(size), view = new DataView(bytes.buffer);
    if (size === 8) view.setBigUint64(0, BigInt(value), true);
    else if (size === 4) view.setUint32(0, value, true);
    else view.setUint16(0, value, true);
    return bytes;
  };
  const join = parts => {
    const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) { result.set(part, offset); offset += part.length; }
    return result;
  };
  const safeName = value => String(value || 'photo.jpg').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 120);

  // ZIP64 + data descriptors allow a single archive of any photo count/size.
  // Only the current network chunk and the small central directory stay in memory
  // when the caller pipes this stream directly to a file.
  function stream(items, { fetcher = fetch, onProgress = () => {} } = {}) {
    const abort = new AbortController();
    async function* generate() {
      let offset = 0n;
      const directory = [];
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const name = encoder.encode(`${String(index + 1).padStart(4, '0')}-${safeName(item.name)}`);
        const localOffset = offset;
        const extra = join([number(1, 2), number(16, 2), number(0, 8), number(0, 8)]);
        const header = join([
          number(0x04034b50, 4), number(45, 2), number(0x0808, 2), number(0, 2), number(0, 2), number(33, 2),
          number(0, 4), number(0xffffffff, 4), number(0xffffffff, 4), number(name.length, 2), number(extra.length, 2), name, extra,
        ]);
        onProgress(index, items.length);
        const response = await fetcher(item.url, { signal: abort.signal });
        if (!response.ok) throw new Error(`Photo ${index + 1}: HTTP ${response.status}`);
        yield header; offset += BigInt(header.length);
        let size = 0n, crc = 0xffffffff;
        const reader = response.body?.getReader();
        try {
          if (reader) {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              for (const byte of value) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
              size += BigInt(value.length); offset += BigInt(value.length); yield value;
            }
          } else {
            const bytes = new Uint8Array(await response.arrayBuffer());
            for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
            size = BigInt(bytes.length); offset += size; yield bytes;
          }
        } finally { if (reader) { try { await reader.cancel(); } finally { reader.releaseLock(); } } }
        crc = (crc ^ 0xffffffff) >>> 0;
        const descriptor = join([number(0x08074b50, 4), number(crc, 4), number(size, 8), number(size, 8)]);
        yield descriptor; offset += BigInt(descriptor.length);
        const centralExtra = join([number(1, 2), number(24, 2), number(size, 8), number(size, 8), number(localOffset, 8)]);
        directory.push(join([
          number(0x02014b50, 4), number(45, 2), number(45, 2), number(0x0808, 2), number(0, 2), number(0, 2), number(33, 2),
          number(crc, 4), number(0xffffffff, 4), number(0xffffffff, 4), number(name.length, 2), number(centralExtra.length, 2),
          number(0, 2), number(0, 2), number(0, 2), number(0, 4), number(0xffffffff, 4), name, centralExtra,
        ]));
        onProgress(index + 1, items.length);
      }
      const centralOffset = offset;
      for (const record of directory) { yield record; offset += BigInt(record.length); }
      const centralSize = offset - centralOffset;
      yield join([
        number(0x06064b50, 4), number(44, 8), number(45, 2), number(45, 2), number(0, 4), number(0, 4),
        number(items.length, 8), number(items.length, 8), number(centralSize, 8), number(centralOffset, 8),
        number(0x07064b50, 4), number(0, 4), number(offset, 8), number(1, 4),
        number(0x06054b50, 4), number(0, 2), number(0, 2), number(0xffff, 2), number(0xffff, 2),
        number(0xffffffff, 4), number(0xffffffff, 4), number(0, 2),
      ]);
    }
    const iterator = generate();
    return new ReadableStream({
      async pull(controller) {
        try { const { value, done } = await iterator.next(); if (done) controller.close(); else controller.enqueue(value); }
        catch (error) { abort.abort(); controller.error(error); }
      },
      async cancel() { abort.abort(); await iterator.return(); },
    });
  }
  window.EventPhotoZip = { stream };
})();
