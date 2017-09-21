/* Adapted from Beaker Profile API, (c) 2017 Paul Frazee */

exports.required = function (v, fieldname) {
  if (!v) {
    throw new Error(`Missing field (${fieldname})`);
  }
  return v;
}

exports.string = function (v, opts) {
  if (typeof v === 'number') {
    v = v.toString();
  }
  if (typeof v === 'string') {
    return v;
  }
  if (opts && opts.required) {
    throw new Error('Missing field (string)');
  }
  return null;
}

exports.object = function (v, opts) {
  if (v && typeof v === 'object') {
    return v;
  }
  if (opts && opts.required) {
    throw new Error('Missing field (object)');
  }
  return null;
}

exports.path = function (v) {
  v = exports.string(v);
  if (v && !v.startsWith('/')) {
    v = '/' + v;
  }
  return v;
}

exports.array = (arr) => Array.isArray(arr) ? arr : [arr];

exports.arrayOfStrings = function (arr) {
  arr = exports.array(arr);
  return arr.map(exports.string).filter(Boolean);
}

exports.arrayOfObjects = function (arr) {
  arr = exports.array(arr);
  return arr.map(exports.object).filter(Boolean);
}

exports.datUrl = function (v) {
  if (v && typeof v === 'string') {
    if (v.startsWith('http')) {
      return null;
    }
    if (!v.startsWith('dat://')) {
      v = 'dat://' + v;
    }
    return v;
  }
  return null;
}

exports.number = function (v, opts) {
  v = +v;
  if (opts && opts.required) {
    if (typeof v !== 'number') {
      throw new Error('Invalid field, must be a number');
    }
  }
  return v;
}
