// http-shim.cjs
const events = require('node:events');

class Server extends events.EventEmitter {
  listen() { return this; }
  close() { return this; }
  address() { return { port: 8788, family: 'IPv4', address: '127.0.0.1' }; }
}

module.exports = {
  METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  STATUS_CODES: {},
  IncomingMessage: function() { return new events.EventEmitter(); },
  ServerResponse: function() { return new events.EventEmitter(); },
  Agent: function() {},
  globalAgent: {},
  validateHeaderName: () => {},
  validateHeaderValue: () => {},
  createServer: () => new Server(),
  request: () => {
    const req = new events.EventEmitter();
    req.end = () => {};
    req.write = () => {};
    return req;
  },
};
