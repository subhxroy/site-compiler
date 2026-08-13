import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const bufToCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(bufToCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateSiteCompilerPng(size: number): Buffer {
  const rowSize = 1 + size * 3;
  const rawData = Buffer.alloc(size * rowSize);
  const center = size / 2;
  const radius = size * 0.42;

  for (let y = 0; y < size; y++) {
    const offset = y * rowSize;
    rawData[offset] = 0; // Filter byte: None

    for (let x = 0; x < size; x++) {
      const pxOffset = offset + 1 + x * 3;
      const dx = Math.abs(x - center);
      const dy = Math.abs(y - center);

      // Diamond icon shape (Raycast coral style)
      if (dx + dy <= radius) {
        // Inner diamond: coral red #ff6363
        rawData[pxOffset] = 0xff;     // R
        rawData[pxOffset + 1] = 0x63; // G
        rawData[pxOffset + 2] = 0x63; // B
      } else {
        // Dark theme background #0a0b0d
        rawData[pxOffset] = 0x0a;     // R
        rawData[pxOffset + 1] = 0x0b; // G
        rawData[pxOffset + 2] = 0x0d; // B
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    createPngChunk('IHDR', ihdr),
    createPngChunk('IDAT', compressed),
    createPngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const icon192 = generateSiteCompilerPng(192);
const icon512 = generateSiteCompilerPng(512);

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

console.log('Successfully generated public/icon-192.png and public/icon-512.png');
