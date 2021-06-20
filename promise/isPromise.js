// 判断是否是promise
function isPromise(value) {
  return value
    && (typeof value === 'object' || typeof value === 'function')
    && typeof value.then === 'function';
}

module.exports = isPromise;
