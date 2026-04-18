// Shim for depd to work in Cloudflare Workers (avoids new Function)
export default function depd(namespace: string) {
  function deprecate(message: string) {}
  deprecate.function = (fn: Function) => fn;
  deprecate.property = () => {};
  return deprecate;
}
