const loaderUtils = require('loader-utils');
const app = require('./index');
/**
 * The loader that implements {@link SvelteExtend} for webpack.
 * The only option the loader has is `allowedMaxDepth`: How many components level can be
 * extended.
 * For example, if a file extends from one that extends from another and this is set to
 * `1`, the parsing will fail.
 * This loader is async.
 *
 * @param {string} source  The contents of the file to process.
 */
module.exports = function svelteExtendWebpackLoader(source) {
  const { allowedMaxDepth = 0 } = loaderUtils.getOptions(this) || {};
  const callback = this.async();
  app
    .extend(source, this.resourcePath, allowedMaxDepth)
    .then((formatted) => {
      callback(null, formatted);
    })
    .catch((error) => {
      callback(error);
    });
};
