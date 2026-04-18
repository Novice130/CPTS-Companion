// os-shim.cjs
module.exports = {
  hostname: () => 'cloudflare-worker',
  type: () => 'Workers',
  platform: () => 'browser',
  arch: () => 'v8',
  release: () => '1.0.0',
  uptime: () => 0,
  loadavg: () => [0, 0, 0],
  totalmem: () => 128 * 1024 * 1024,
  freemem: () => 64 * 1024 * 1024,
  cpus: () => [{ model: 'v8', speed: 0, times: {} }],
  networkInterfaces: () => ({}),
  homedir: () => '/',
  tmpdir: () => '/tmp',
  endianness: () => 'LE',
};
