// tty-shim.cjs
module.exports = {
  isatty: () => false,
  ReadStream: function() {},
  WriteStream: function() {}
};
