const console = global.console;

class CIError extends Error {
  get name() {
    return "ConsoleInterceptorError";
  }
}
const arrify = (array) => (Array.isArray(array) ? array : [array]).filter(Boolean);

/** Restores un-patched global console */
const disable = () => {
  global.console = console;
};

const symbol = {
  swallow: Symbol("swallow"),
};

const handlers = new Set();

/**
 * @callback handler Handle what to do with every `console[method](...argument)` call
 * @param {string} method `console[**method**]` Method used on console
 * @param {array} arguments `console[method](...**arguments**)` Message arguments passed to console
 * @param {object} extra
 * @param {symbol} extra.swallow Return this to swallow this console message
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
  if (typeof handler !== "function") throw new TypeError("handler must be a function");
  if (handlers.has(handler)) throw new Error("This handler is already registered");
  handlers.add(handler);

  if (typeof opts === "function") opts = { onError: opts };

  function onError(error, { method, arguments, defaultCalled = false }) {
    const log = () => console[method](...arrify(arguments));
    const logError = () => console.error(error);
    if (opts.onError && !defaultCalled)
      return opts.onError(error, {
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
  }

  const patched =
    (method) =>
    (...arguments) => {
      const handlerThis = { method, arguments, disable };
      const handlerExtra = { disable, swallow: symbol.swallow };
      const handleError = (error) =>
        onError.call({ method, arguments }, new CIError(error.message), { method, arguments });
      const handleReturnValue = (returnValue) => {
        const { method, arguments } = handlerThis;
        if (returnValue === handlerExtra.swallow) {
          return;
        } else if (returnValue && (returnValue.method || returnValue.arguments)) {
          return console[returnValue.method || method](
            ...arrify(returnValue.arguments || arguments),
          );
        } else if (returnValue !== undefined) {
          return console[method](...arrify(returnValue));
        } else {
          return console[method](...arrify(arguments));
        }
      };
      try {
        for (const handler of handlers) {
          const returnValue = handler.call(handlerThis, method, arguments, handlerExtra);
          if (returnValue && returnValue.then) {
            returnValue.then(handleReturnValue).catch(handleError);
          } else {
            handleReturnValue(returnValue);
          }
        }
      } catch (error) {
        handleError(error);
      }
    };

  const consolePatch = new Proxy(console, {
    get: (c, method) => {
      if (typeof method !== "string" || typeof console[method] !== "function")
        return console[method];
      else return patched(method);
    },
  });

  global.console = consolePatch;

  return disable;
};

enable.enable = enable;
enable.disable = disable;
module.exports = enable;
