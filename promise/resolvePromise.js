// 判断循环promise
function resolvePromise(promise, x, resolve, reject) {
  if(x === promise) {
    return reject(new TypeError(`Chaining cycle detected for promise #<Promise>`));
  }
  /**
   * 判断是否是promise有三个条件
   * 1.是对象，且不是null
   * 2.是函数
   * 3.满足1，2其中一个的基础上，有then属性，且是个函数
   */
  if((typeof x === 'object' && x !== null) || typeof x === 'function') {
    // 确保即使x是他人自定义的promise对象时，状态改变也只执行一次
    let called;
    try { // 如果then属性通过getter定义
      let then = x.then;
      if (typeof then === 'function') {// 是promise
        // then方法调用时绑定this,否则可能会导致this指向变更; 第二个参数成功回调
        then.call(
          x,
          y => {
            if(called) return;
            called = true;
            // y仍然可能是promise
            resolvePromise(promise, y, resolve, reject);
          },
          r => {//失败回调
            if(called) return;
            called = true;
            reject(r);
          }
        )
      }
      else {
        resolve(x);
      }

    } catch (e) {
      if(called) return;
      called = true;
      reject(e);
    }

  }
  else { // 普通值
    resolve(x);
  }
}

module.exports = resolvePromise;
