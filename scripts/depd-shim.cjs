// Shim for depd to work in Cloudflare Workers (CommonJS version)
function depd(namespace) {
  function deprecate(message) {}
  deprecate.function = function(fn) { return fn; };
  deprecate.property = function() {};
  return deprecate;
}

module.exports = depd;
