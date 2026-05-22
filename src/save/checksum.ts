// CRC32 (IEEE 802.3 多項式). セーブの破損・改竄検出用. 暗号用途ではない.

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

export function crc32(s: string): number {
  let crc = 0xffffffff;
  for (let i = 0; i < s.length; i += 1) {
    crc = (crc >>> 8) ^ TABLE[(crc ^ s.charCodeAt(i)) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function crc32Hex(s: string): string {
  return crc32(s).toString(16).padStart(8, "0");
}
