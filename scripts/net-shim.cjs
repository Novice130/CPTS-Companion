// net-shim.cjs
const events = require('node:events');

class Socket extends events.EventEmitter {
  constructor() {
    super();
    this.writable = true;
    this.readable = true;
  }
  connect() { return this; }
  destroy() { return this; }
  end() { return this; }
  write() { return true; }
  pause() { return this; }
  resume() { return this; }
  setNoDelay() { return this; }
  setKeepAlive() { return this; }
  address() { return { port: 8788, family: 'IPv4', address: '127.0.0.1' }; }
}

class Server extends events.EventEmitter {
  listen() { return this; }
  close() { return this; }
  address() { return { port: 8788, family: 'IPv4', address: '127.0.0.1' }; }
}

module.exports = {
  isIP: () => 0,
  isIPv4: () => false,
  isIPv6: () => false,
  Socket,
  Server,
  createServer: () => new Server(),
  createConnection: () => new Socket(),
  connect: () => new Socket(),
};
