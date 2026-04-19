// Shim for iconv-lite to work in Cloudflare Workers
// We use TextEncoder/TextDecoder which are natively supported.

export function decode(buf: any, encoding: string) {
  const decoder = new TextDecoder(encoding || 'utf-8');
  return decoder.decode(buf);
}

export function encode(str: string, encoding: string) {
  const encoder = new TextEncoder();
  // Note: TextEncoder only supports utf-8
  return encoder.encode(str);
}

export function encodingExists(encoding: string) {
  try {
    new TextDecoder(encoding);
    return true;
  } catch (e) {
    return false;
  }
}

export function getDecoder(encoding: string) {
  const dec = new TextDecoder(encoding || 'utf-8');
  let chunks: Uint8Array[] = [];
  return {
    write(buf: Uint8Array | Buffer) {
      chunks.push(buf instanceof Uint8Array ? buf : new Uint8Array(buf));
      return '';
    },
    end() {
      const merged = new Uint8Array(chunks.reduce((a, b) => a + b.length, 0));
      let offset = 0;
      for (const c of chunks) { merged.set(c, offset); offset += c.length; }
      chunks = [];
      return dec.decode(merged);
    }
  };
}

export default {
  decode,
  encode,
  encodingExists,
  getDecoder,
};
