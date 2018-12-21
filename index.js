const console = global.console;

class CIError extends Error { get name() { return 'ConsoleInterceptorError' } }
const arrify = array => (Array.isArray(array) ? array : [array]).filter(Boolean);

/** Restores un-patched global console */
const disable = () => { global.console = console };

/**
 * @callback handler Handle what to do with every `console[method](...argument)` call
 * @param {string} method `console[**method**]` Method used on console
 * @param {array} arguments `console[method](...**arguments**)` Message arguments passed to console
 */
/**
 * @callback onError Called when the `handler` or the lib itself throws an error
 * @param {error} error Thrown error
 * @param {object} extra
 * @param {string} extra.method `console[**method**]` Method used on console
 * @param {array} extra.arguments `console[method](...**arguments**)` Message arguments passed to console
 * @param {console} extra.console Original un-patched `console`
 * @param {function} extra.onError Perform default behavior if this callback hadn't been provided
 * @param {function} extra.log Log the original message `console[method](...arguments)`
 * @param {function} extra.logError Log the error `console.error(error)`
 * @param {disable} extra.disable Restores un-patched global console
 */

/**
 * Patches global console with an Interceptor
 * @param {handler} handler
 * @param {object|onError} [opts]
 * @param {onError} [opts.onError]
 * @return {function} Restores un-patched global console
 */
const enable = (handler, opts = {}) => {

  if (typeof opts === 'function') opts = { onError: opts };

  function onError(error, { method, arguments, defaultCalled = false }) {
    const log = () => console[method](...arrify(arguments));
    const logError = () => console.error(error);
    if (opts.onError && !defaultCalled) return opts.onError(error, {
      console,
      method,
      arguments,
      onError: () => onError(error, { method, arguments, defaultCalled: true }),
      log,
      logError,
      disable,
    });
    logError();
    disable();
    log();
  };

  const patched = (method) => (...arguments) => {
    const handlerThis = { method, arguments, disable };
    const handleError = (error) => onError.call({ method, arguments }, new CIError(error.message), { method, arguments });
    const handleReturnValue = (returnValue) => {
      const { method, arguments } = handlerThis;
      if (returnValue && (returnValue.method || returnValue.arguments)) {
        return console[returnValue.method || method](...arrify(returnValue.arguments || arguments));
      } else if (returnValue !== undefined) {
        return console[method](...arrify(returnValue));
      } else {
        return console[method](...arrify(arguments));
      }
    }
    try {
      const returnValue = handler.call(handlerThis, method, arguments);
      if (returnValue && returnValue.then) {
        returnValue.then(handleReturnValue).catch(handleError);
      } else {
        handleReturnValue(returnValue);
      }
    } catch (error) {
      handleError(error)
    }
  };

  const consolePatch = new Proxy(console, {
    get: (c, method) => {
      if (typeof method !== 'string' || typeof console[method] !== 'function') return console[method];
      else return patched(method);
    }
  });

  global.console = consolePatch;

  return disable;
};

enable.enable = enable;
enable.disable = disable;
module.exports = enable;
