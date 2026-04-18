
exports.parse = function(string) {
  if (!string) throw new TypeError('argument string is required');
  var header = typeof string === 'object'
    ? (string.getHeader ? string.getHeader('content-type') : (string.headers ? string.headers['content-type'] : null))
    : string;
  
  if (typeof header !== 'string') {
    throw new TypeError('argument string is required to be a string');
  }

  var index = header.indexOf(';');
  var type = index !== -1 ? header.slice(0, index).trim() : header.trim();
  
  return {
    type: type.toLowerCase(),
    parameters: {}
  };
};

exports.format = function(obj) {
  return obj.type;
};
