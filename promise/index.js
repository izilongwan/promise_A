const isPromise = require('./isPromise'),
      resolvePromise = require('./resolvePromise');

const state = {
  PENDING: 0,
  FULFILLED: 1,
  REJECTED: 2,
}

/**
 * 1. Promise实例化时有个执行器函数，会立即执行
 * 2. 执行器有两个方法，第一个是resolve, 第二个是reject
 * 3. promise实例有三种状态，pending, fulfilled, rejected
 *    默认是pending, 调用resolve后变为fulfilled; 调用reject后变为rejected
 * 4. 状态不可逆, 只能pending->fulfilled, 或者pending -> rejected
 * 5. 每个promise实例都有个then方法，then方法有两个参数，
 *    第一个是成功回调onFulfilled，第二个是失败回调onRejected
 * 6. 执行器的resolve函数会触发成功回调onFulfilled，
 *    执行器的reject函数或者throw触发失败回调onRejected
 * 7. then方法返回的是一个promise对象。
 * 8. 每个promise对象都有catch方法。
 * 9. Promise类（构造函数）有静态方法Promise.resolve(value)/Promise.reject(value)
 * 10. Promise类（构造函数）有静态方法Promise.all([...])返回一个promise实例
 *     解决异步任务并发的问题，返回结果数组按照异步任务的顺序返回
 */

class Promise {
  value = null;
  reason = null;
  state = state.PENDING;
  onFulfilledCallbacks = [];// then成功回调队列
  onRejectedCallbacks = [];// then失败回调队列

  constructor (executor) {
    const resolve = (value) => {
      // resolve的值如果是promise, 则一直取值直到非promise为止
      if (value instanceof Promise) {
        value.then(resolve, reject);
      }

      else if (this.state === state.PENDING) {
        this.state = state.FULFILLED;
        this.value = value;

        this.onFulfilledCallbacks.forEach(fn => fn());
      }
    }

    const reject = (reason) => {
      if (this.state === state.PENDING) {
        this.state = state.REJECTED;
        this.reason = reason;

        this.onRejectedCallbacks.forEach(fn => fn());
      }
    }

    try {
      executor(resolve, reject);
    }

    catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {// 两个回调函数,都是可选参数
    // 当参数不是回调函数或者省略时,赋予默认回调函数,将值向后传递
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
    onRejected = typeof onRejected === 'function' ? onRejected : e => { throw e };

    // 返回promise可以实现链式调用
    const promise = new Promise((resolve, reject) => {

      const { FULFILLED, REJECTED, PENDING } = state;

      switch (this.state) {
        case PENDING:
          this.onFulfilledCallbacks.push(() => {
            //微任务，等到new实例完成之后，获取返回的promise;否则promise未定义
            process.nextTick(() => {
              try {
                const x = onFulfilled(this.value);
                // x有可能是promise对象，则需要继续处理，直至返回的是普通数据（非异常和promise）
                resolvePromise(promise, x, resolve, reject);
              } catch (e) {
                reject(e);
              }
            });
          })
          this.onRejectedCallbacks.push(() => {
            process.nextTick(() => {
              try {
                const x = onRejected(this.reason);

                resolvePromise(promise, x, resolve, reject);
              } catch (e) {
                reject(e);
              }
            });
          })
          break;

        case FULFILLED:
          process.nextTick(() => {
            try {
              const x = onFulfilled(this.value);

              resolvePromise(promise, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
          break;

        case REJECTED:
          process.nextTick(() => {
            try {
              const x = onRejected(this.reason);

              resolvePromise(promise, x, resolve, reject);
            } catch (e) {
              reject(e);
            }
          });
          break;

        default:
          break;
      }

    })

    return promise;
  }

  catch (callback) {
    return this.then(null, callback);
  }

  finally(cb) {
    return this.then(
      () => Promise.resolve(cb()).then(value => value),
      (e) => Promise.reject(cb()).then(() => { throw e })
    )
  }

  // static function

  static resolve(value) {
    return isPromise(value)
      ? value
      : new Promise((resolve, reject) => resolve(value));
  }

  static reject(reason) {
    return isPromise(reason)
      ? reason
      : new Promise((resolve, reject) => reject(reason));
  }

  static all(promises = []) { // 处理并发；promises的数组中可以不是promise
    return new Promise((resolve, reject) => {
      const len = promises.length,
            result = [];// 存储promise的结果

      if (len <= 0) {
        return resolve(result);
      }

      let idx = 0; //确保每个promise项都执行过

      promises.forEach((promise, i) => {
        isPromise(promise)
          ? promise.then(value => doPromise(i, value), reject)//只要有一个reject状态就变rejected
          : doPromise(i, promise);
      })

      function doPromise(i, value) {
        result[i++] = value;
        ++idx === len && resolve(result);
      }
    })
  }

  static race(promises) {
    return new Promise((resolve, reject) => {

      promises.forEach(promise => {
        isPromise(promise)
          ? promise.then(value => resolve(value), reject)
          : resolve(promise);
      })

    })
  }

  static allSettled(promises) {
    return new Promise((resolve, reject) => {
      const len = promises.length;

      if (len <= 0) {
        return resolve([]);
      }

      const result = [];

      let idx = 0;

      promises.forEach((promise, i) => {
        isPromise(promise)
          ? promise.then(
            value => doPromise(i, { value, status: 'fulfilled' }),
            reason => doPromise(i, { reason, status: 'rejected' }))
          : doPromise(i, { value: promise, status: 'fulfilled' });
      })

      function doPromise(i, data) {
        result[i++] = data;

        ++idx === len && resolve(result);
      }
    })
  }

  // 测试Promise是否符合规范
  static deferred () {
    const dfd = {};

    dfd.promise = new Promise((resolve, reject) => {
      dfd.resolve = resolve;
      dfd.reject = reject;
    })
    return dfd;
  }
}

module.exports = Promise;
