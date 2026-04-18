// stream-shim.cjs
const Stream = require('node:stream');
// Node's 'stream' module is also the 'Stream' constructor.
// We need to ensure the exported object behaves this way.
module.exports = Stream.Stream || Stream;
// Copy properties
for (const key in Stream) {
  module.exports[key] = Stream[key];
}
