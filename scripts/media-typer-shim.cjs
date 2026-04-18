
const typeRegExp = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;

function splitType(string) {
  var match = typeRegExp.exec(string.toLowerCase())
  if (!match) {
    throw new TypeError('invalid media type')
  }
  var type = match[1]
  var subtype = match[2]
  var suffix
  var index = subtype.lastIndexOf('+')
  if (index !== -1) {
    suffix = subtype.substr(index + 1)
    subtype = subtype.substr(0, index)
  }
  return { type: type, subtype: subtype, suffix: suffix }
}

exports.parse = function(string) {
  if (!string) return { type: '', subtype: '', suffix: '', parameters: {} };
  if (typeof string === 'object') {
     // Mock getcontenttype
     if (string && typeof string.getHeader === 'function') {
       string = string.getHeader('content-type');
     } else if (string && typeof string.headers === 'object') {
       string = string.headers['content-type']
     } else {
       string = '';
     }
  }
  if (typeof string !== 'string') return { type: '', subtype: '', suffix: '', parameters: {} };
  
  try {
    var index = string.indexOf(';')
    var type = index !== -1 ? string.substr(0, index) : string
    var obj = splitType(type)
    obj.parameters = {}
    return obj
  } catch (e) {
    return { type: '', subtype: '', suffix: '', parameters: {} };
  }
};

exports.format = function(obj) {
  return obj.type + '/' + obj.subtype;
};
