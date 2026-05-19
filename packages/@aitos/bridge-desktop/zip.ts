import { Atom, Context, Result } from '@aitos/core';

async function unzipZipFile(buffer: ArrayBuffer): Promise<Array<{ name: string; content: string }>> {
  const entries: Array<{ name: string; content: string }> = [];
  const view = new DataView(buffer);
  const len = buffer.byteLength;

  // Find EOCD signature (0x06054b50)
  let eocdOffset = -1;
  for (let i = len - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('Invalid zip: no end of central directory');

  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const cdEntries = view.getUint16(eocdOffset + 8, true);
  const decoder = new TextDecoder();

  // Parse central directory
  const fileHeaders: Array<{ name: string; localOffset: number }> = [];
  let cdPos = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    if (view.getUint32(cdPos, true) !== 0x02014b50) throw new Error('Invalid central directory entry');
    const nameLen = view.getUint16(cdPos + 28, true);
    const extraLen = view.getUint16(cdPos + 30, true);
    const commentLen = view.getUint16(cdPos + 32, true);
    const localOffset = view.getUint32(cdPos + 42, true);
    fileHeaders.push({ name: decoder.decode(new Uint8Array(buffer, cdPos + 46, nameLen)), localOffset });
    cdPos += 46 + nameLen + extraLen + commentLen;
  }

  // Extract each file
  for (const fh of fileHeaders) {
    if (fh.name.endsWith('/')) continue;

    let pos = fh.localOffset;
    if (view.getUint32(pos, true) !== 0x04034b50) throw new Error(`Invalid local header for ${fh.name}`);

    const compression = view.getUint16(pos + 8, true);
    const nameLen = view.getUint16(pos + 26, true);
    const extraLen = view.getUint16(pos + 28, true);
    const compressedSize = view.getUint32(pos + 18, true);

    pos += 30 + nameLen + extraLen;
    const rawData = new Uint8Array(buffer, pos, compressedSize);

    let content: string;
    if (compression === 0) {
      content = decoder.decode(rawData);
    } else if (compression === 8) {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(rawData);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      let totalLen = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLen += value.length;
      }
      const result = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
      content = decoder.decode(result);
    } else {
      throw new Error(`Unsupported compression method: ${compression}`);
    }

    entries.push({ name: fh.name, content });
  }

  return entries;
}

class ReadZipFileAtom implements Atom {
  name = 'readZipFile';
  version = '1.0.0';
  meta = {
    input: [
      { name: 'data', type: 'any', description: 'ArrayBuffer of the zip file' }
    ],
    output: { type: 'array', description: 'Array of {name: string, content: string} entries' }
  };
  characteristics = { stateless: true, atomic: true, composable: true };

  async execute(input: { data: ArrayBuffer }, context: Context): Promise<Result> {
    try {
      const entries = await unzipZipFile(input.data);
      return { success: true, data: entries };
    } catch (e: any) {
      return { success: false, error: `Failed to unzip: ${e.message}` };
    }
  }
}

export const readZipFileAtom = new ReadZipFileAtom();
