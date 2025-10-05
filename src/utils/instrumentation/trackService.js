// src/utils/instrumentation/trackService.js
const _global = (typeof global !== 'undefined' ? global : window);
if (!_global.__SERVICE_CALLS__) _global.__SERVICE_CALLS__ = {};

export function trackExports(serviceObj, serviceName) {
  if (!__DEV__) return serviceObj;

  const calls = (_global.__SERVICE_CALLS__[serviceName] = _global.__SERVICE_CALLS__[serviceName] || {});
  return new Proxy(serviceObj, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val !== 'function') return val;
      return function tracked(...args) {
        calls[prop] = (calls[prop] || 0) + 1;
        try {
          return val.apply(this, args);
        } catch (e) {
          calls[prop + ':error'] = (calls[prop + ':error'] || 0) + 1;
          throw e;
        }
      };
    }
  });
}

export function dumpServiceCalls() {
  try {
    const data = JSON.stringify(_global.__SERVICE_CALLS__, null, 2);
    // In RN kun je dit via React Native FS of tijdelijk via console.log exporteren.
    // Voor simpelheid:
    console.log('@@SERVICE_CALLS@@\n' + data + '\n@@END@@');
    return data;
  } catch (e) {
    console.warn('dumpServiceCalls failed', e);
  }
}

export function getServiceCalls() {
  return _global.__SERVICE_CALLS__ || {};
}

export function resetServiceCalls() {
  _global.__SERVICE_CALLS__ = {};
}