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
		}, _config);

		this.handlers = {};
		this.middleware = [];

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

		return promiseChain;

	}

	/*
	 * Executes a single middleware function.
	 */
	__executeFunction (executableFunc, primaryValue, otherArgs, prevResult) {

		return new Promise((resolve, reject) => {

			const next = (err, result) => (err ? reject(err) : resolve(result));

			// Do we pass the previous result as a parameter to the next middleware?
			if (this.config.chainMiddlewareResults) { otherArgs.push(prevResult); }

			executableFunc(primaryValue, ...otherArgs, next);

		});

	}

};
