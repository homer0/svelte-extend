const loaderUtils = require('loader-utils');
const app = require('./index');

module.exports = function svelteExtendWebpackLoader(source) {
  const { allowedMaxDepth = 0 } = loaderUtils.getOptions(this) || {};
  const callback = this.async();
  app.extend(source, this.resourcePath, allowedMaxDepth)
  .then((formatted) => {
    callback(null, formatted);
  })
  .catch((error) => {
    callback(error);
  });
};
