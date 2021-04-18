/**
 * @external Jimple
 * @see https://yarnpkg.com/en/package/jimple
 */

/**
 * @external Class
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
 */

/**
 * @typedef {Object} SFCTag
 * @property {string} contents    The content of the tag.
 * @property {Object} attributes  A dictionary of the tag attributes and their values.
 */

/**
 * @callback ProviderRegisterMethod
 * @param {Jimple} app  A reference to the dependency injection container.
 */

/**
 * @typedef {Object} Provider
 * @property {ProviderRegisterMethod} register  The method that gets called when
 *                                              registering the provider.
 */
