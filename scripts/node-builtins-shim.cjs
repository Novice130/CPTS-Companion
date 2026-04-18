// Comprehensive shim for Node.js built-ins in Cloudflare Workers
const events = require('node:events');

module.exports = {
  // OS Shim
  os: {
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
  },
  
  // TTY Shim
  tty: {
    isatty: () => false,
    ReadStream: function() {},
    WriteStream: function() {}
  },

  // NET Shim
  net: {
    isIP: () => 0,
    isIPv4: () => false,
    isIPv6: () => false,
    createServer: () => new events.EventEmitter(),
    createConnection: () => new events.EventEmitter(),
    connect: () => new events.EventEmitter(),
    Socket: function() { return new events.EventEmitter(); }
  },

  // HTTP Shim (Minimal)
  http: {
    METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    STATUS_CODES: {},
    IncomingMessage: function() { return new events.EventEmitter(); },
    ServerResponse: function() { return new events.EventEmitter(); },
    Agent: function() {},
    globalAgent: {},
    validateHeaderName: () => {},
    validateHeaderValue: () => {},
  }
};
