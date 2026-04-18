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

export default {
  decode,
  encode,
  encodingExists
};
