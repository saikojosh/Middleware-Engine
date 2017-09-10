'use strict';

/*
 * MIDDLEWARE ENGINE
 */

const extender = require(`object-extender`);

module.exports = class MiddlewareEngine {

	/*
	 * Instantiate a new middleware engine.
	 */
	constructor (_config) {

		// These configuration options change the behaviour of the middleware engine.
		this.config = extender.defaults({
			chainMiddlewareResults: false,
			throwOnMissingHandler: true,
			throwOnMissingDependency: true,
		}, _config);

		this.requirements = [];
		this.injected = {};
		this.handlers = {};
		this.middleware = [];

	}

	/*
	 * Returns an array of dependency names this module requires, or any empty array.
	 */
	requires () {
		return this.requirements || [];
	}

	/*
	 * Allows dependencies to be injected after the engine has been initialised.
	 */
	inject (key, dependency) {
		this.injected[key] = dependency;
	}

	/*
	 * Returns true if all the required dependencies have been injected.
	 */
	areDependenciesSatisfied () {

		const requirements = this.requires();
		const missingDependency = requirements.some(requirement => !this.hasDependency(requirement));

		return !missingDependency;

	}

	/*
	 * Returns true if the given dependency has been injected.
	 */
	hasDependency (key) {
		return Boolean(this.__dep(key));
	}

	/*
	 * Returns a pointer to the given injected dependency, if any.
	 */
	__dep (key) {

		const dependency = this.injected[key];

		if (!dependency && this.config.throwOnMissingDependency) { throw new Error(`MISSING_DEPENDENCY`); }

		return dependency;

	}

	/*
	 * Store handler middleware for later execution.
	 */
	configure (handlerId, ..._funcs) {

		let functionList;

		try {
			functionList = this.__reduceToFunctionList(_funcs);
		}
		catch (err) {
			throw new Error(`One of the parameters you provided for the handler "${handlerId}" is not a function or falsy.`);
		}

		if (!functionList || !functionList.length) {
			throw new Error(`You must provide at least one function for the handler "${handlerId}".`);
		}

		this.handlers[handlerId] = functionList;

	}

	/*
	 * Returns true if the given handler ID has some middleware functions attached.
	 */
	isConfigured (handlerId) {
		return Boolean(this.handlers[handlerId]);
	}

	/*
	 * Store general middleware for later execution.
	 */
	use (..._funcs) {

		let functionList;

		try {
			functionList = this.__reduceToFunctionList(_funcs);
		}
		catch (err) {
			throw new Error(`One of the parameters you provided for to the .use() method is not a function or falsy.`);
		}

		if (!functionList || !functionList.length) {
			throw new Error(`You must provide at least one function to the .use() method.`);
		}

		this.middleware.push(...functionList);

	}

	/*
	 * Takes an array of parameters and returns just thopse that are functions.
	 */
	__reduceToFunctionList (array) {

		const functionList = [];

		array.forEach(func => {
			if (typeof func === `function`) { functionList.push(func); }
			else if (func) { throw new Error(`NOT_A_FUNCTION`); }
		});

		return functionList;

	}

	/*
	 * Executes all the middleware functions provided for the given handler ID.
	 */
	__executeHandler (handlerId, primaryValue, ...otherArgs) {

		const handlerFunctions = this.handlers[handlerId];

		if (!handlerFunctions && this.config.throwOnMissingHandler) {
			throw new Error(`The handler "${handlerId}" has not been configured.`);
		}

		return this.__executeMultipleFunctions(handlerFunctions, primaryValue, ...otherArgs);

	}

	/*
	 * Executes all the general middleware functions that are not handlers.
	 */
	__executeMiddleware (primaryValue, ...otherArgs) {
		return this.__executeMultipleFunctions(this.middleware, primaryValue, ...otherArgs);
	}

	/*
	 * Executes a multiple middleware functions in the order provided.
	 */
	__executeMultipleFunctions (executableFuncs, primaryValue, ...otherArgs) {

		const startsWith = Promise.resolve();
		const promiseChain = executableFuncs.reduce(
			(chain, func) => chain.then(prevResult => this.__executeFunction(func, primaryValue, otherArgs, prevResult)),
			startsWith
		);

		return promiseChain
			.catch(err => {
				if (typeof err !== `string` || err !== `MIDDLEWARE_ENGINE_BREAK`) { throw err; }  // Allow chain breaking when the "stop()" method is called.
			});

	}

	/*
	 * Executes a single middleware function.
	 */
	__executeFunction (executableFunc, primaryValue, _otherArgs, prevResult) {

		const promise = new Promise((resolve, reject) => {

			// Callbacks.
			const next = (err, result) => (err ? reject(err) : resolve(result));
			const stop = err => reject(err || `MIDDLEWARE_ENGINE_BREAK`);

			// Do we pass the previous result as a parameter to the next middleware?
			const otherArgs = (this.config.chainMiddlewareResults ? [..._otherArgs, prevResult] : [..._otherArgs]);

			// Execute the next middleware function and convert its return value into a promise in case it's an async func.
			const middlewareReturnValue = executableFunc.call(this, primaryValue, ...otherArgs, next, stop);
			const middlewareReturnPromise = Promise.resolve(middlewareReturnValue);

			// Return the actual (top-level) promise we are waiting on, or reject it if an error occured.
			return middlewareReturnPromise.then(() => promise).catch(reject);

		});

		return promise;

	}

};
