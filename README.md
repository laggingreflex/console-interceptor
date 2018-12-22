
# console-interceptor

Monkey-patches all `console.*` methods (using ES Proxy) and lets you intercept the arguments.

## Install

```
npm i console-interceptor
```

## Usage

```js
const disable = require('console-interceptor')(handler, {onError})
```
```js
function handler (method, arguments, { swallow }) {

  // where `method` = original console[method] used, log|error|warn|...
  // and `arguments` = original arguments passed to console[method](...arguments)

  // You can control what will eventually get logged in any of the following ways:

  // let original console method/arguments be called as-is
  return
  // => console[method](...arguments)

  // log nothing
  return swallow

  // Return a string, or {arguments: 'string'}, or a Promise, or set this.arguments
  // to log that string
  return 'log this'
  return Promise.resolve('log this')
  return Promise.resolve({ arguments: 'log this' })
  this.arguments = 'log this'
  // => console[method]('log this')

  // Return an array, or {arguments: [array]}, or a Promise, or set this.arguments
  // to use it as arguments to console method
  return ['log', 'this']
  return { arguments: ['log', 'this'] }
  return Promise.resolve(['log', 'this'])
  return Promise.resolve({ arguments: ['log', 'this'] })
  this.arguments = ['log', 'this']
  // => console[method]('log', 'this')

  // Return {method: 'string'}, or a Promise, or set this.method
  // to change the console[method] used to log the argument
  return { method: 'info' }
  return Promise.resolve({ method: 'info' })
  this.method = 'info'
  // => console['info'](...arguments)

  // Mix and match any of the above
  this.method = 'info'
  return Promise.resolve({ arguments: ['log', 'this'] })
  // => console['info']('log', 'this')

  // Return values take precedence over setting `this`

}
```
```js
// [optional] Called when the `handler` above, or the lib itself throws an error
function onError (error, {
  method,
  arguments,
  console, // original un-patched console
  log, // logs the original message => console[method](...arguments)
  logError, // logs the error => console.error(error)
  disable // disables this lib to prevent future errors
  onError, // default behavior if this callback hadn't been provided
}) {

  // The default behavior (if this callback isn't provided) is this:
  logError()
  disable()
  log()

  // Which can also be achieved (in this callback) by calling
  onError()
}
```
