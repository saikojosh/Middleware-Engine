# Middleware-Engine
A lightweight engine that provides middleware functionality to classes that extend it.

## Quick Start
You must extend the `MiddlewareEngine` class to use its functionality.

```javascript
const MiddlewareEngine = require(`middleware-engine`);

class HelloWorld extends MiddlewareEngine {

	constructor () {
		super({ /* Config for Middleware-Engine goes here... */ });
	}

	printMessage (messages) {
		return Promise.resolve()
			.then(() => this.__executeHandler(`some-handler-id`, messages))
			.then(() => this.__executeMiddleware(messages))
			.then(() => this.__executeHandler(`another-handler-id`, messages))
			.then(() => console.log(messages.join(`\n`)));
	}

}

const instance = new HelloWorld();

instance.configure(`some-handler-id`, someHandlerMiddleware());  // Executed 1st.
instance.configure(`another-handler-id`, anotherHandlerMiddleware()); // Executed 4th.

instance.use(someMiddleware());  // Executed 2nd.
instance.use(someOtherMiddleware()); // Executed 3rd.

instance.printMessage([`This is a message.`, `This is yet another message.`])
	.catch(err => console.error(err));
```

For a fully-featured example take a look at the source code for the [Ultimail module](https://www.npmjs.org/package/ultimail).

## API Overview

### const engine = new MiddlewareEngine(config);
You must extend the `MiddlewareEngine` class and call the `this.__executeMiddleware()` or `this.__executeHandler()` methods to use its functionality.

#### Config Options
You can supply the following config to the constructor.

| Config                 | Default Value | Description |
|------------------------|---------------|-------------|
| chainMiddlewareResults | `false`       | Set to `true` to pass the result of the previous middleware execution to the next middleware function as the second to last parameter. |
| throwOnMissingHandler  | `true`        | Set to `false` to prevent an error being thrown if you call `this.__executeHandler()` on a handler ID that hasn't been configured. |

### engine.use(func1, func2, ...funcN);
**Can be used externally by the consumer of your class.** Add a number of middleware functions by providing one or more arguments. You can call `.use()` as many times as you like or with as many arguments as you like. The middleware is always executed in the order you add them.

### engine.configure(handlerId, func1, func2, ...funcN);
**Can be used externally by the consumer of your class.** Add named handler middleware that should be executed at a specific point by your class, either before or after the general middleware added with `.use()`. You can only call this method once for each `handlerId`, if you call it a second time the handler will be replaced.

### engine.isConfigured(handlerId);
**Can be used externally by the consumer of your class.** Returns true if the given handler ID has been configured with the `.configure()` method.

### engine.inject(dependencyName, dependencyObject);
**Can be used externally by the consumer of your class.** Allows you to inject a dependency into your class which can be accessed inside your class by calling `this.__dep()` (see below). You can inject as many dependencies as you like by calling this method multiple times.

### this.\_\_executeMiddleware(primaryValue, arg1, arg2, ...argN);
**Only to be used internally by your class.** Call this to execute all the middleware that has been added by the consumer via the `.use()` method. Middleware is always executed in the order it was added.

You can pass as many parameters as you like to this method and they will all be passed to each middleware function. You can use the `primaryValue` parameter to pass in an object/array that you want shared between each of the middleware functions (similar to how you can access the `request` and `response` objects in every Express.js middleware).

#### Default Middleware signature
`function (primaryValue, arg1, arg2, ...argN, next, stop) { ... }`.

You must call the `next(err, result)` callback at the end of every middleware or your application will hang. Alternatively, if you're waiting for all the middleware to complete and the promise to be resolved before continuing execution in your application you can use the `stop()` method to immediately resolve the promise. You can also pass an error to `stop(err)`.

#### Alternative Middleware Signature
`function (primaryValue, ...argN, previousResult, next, stop) { ... }`

The result of the previous middleware execution will be available as the second to last parameter `previousResult` if the config option `chainMiddlewareResults` is set in the constructor.

### this.\_\_executeHandler(handlerId, primaryValue, arg1, arg2, ...argN);
**Only to be used internally by your class.** Call this to execute only the middleware functions configured as part of the named handler with `.configure()`. Middleware is always executed in the order it was added.

You can pass as many parameters as you like to this method and they will all be passed to each middleware function. You can use the `primaryValue` parameter to pass in an object/array that you want shared between each of the middleware functions (similar to how you can access the `request` and `response` objects in every Express.js middleware).

By default, if the handler ID has not been configured an error will be thrown. You can silently swallow the error instead by setting the `throwOnMissingHandler` config to `false` in the constructor.

#### Default Middleware signature
`function (primaryValue, arg1, arg2, ...argN, next, stop) { ... }`

You must call the `next(err, result)` callback at the end of every middleware or your application will hang. Alternatively, if you're waiting for all the middleware to complete and the promise to be resolved before continuing execution in your application you can use the `stop()` method to immediately resolve the promise. You can also pass an error to `stop(err)`.

#### Alternative Middleware Signature
`function (primaryValue, ...argN, previousResult, next, stop) { ... }`.

The result of the previous middleware execution will be available as the second to last parameter `previousResult` if the config option `chainMiddlewareResults` is set to `true` in the constructor.

## this.\_\_dep(dependencyName);
**Only to be used internally by your class.** Returns the given injected dependency.
