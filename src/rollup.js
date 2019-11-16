const rollupUtils = require('rollup-pluginutils');
const app = require('./index');

class SvelteExtendRollupPlugin {
  static svelteExtend(options, name) {
    return new SvelteExtendRollupPlugin(options, name);
  }

  constructor(options = {}, name = 'svelte-extend-rollup-plugin') {
    this._options = Object.assign(
      {
        allowedMaxDepth: 0,
        include: [],
        exclude: [],
      },
      options
    );
    this._name = name;
    this._filter = rollupUtils.createFilter(
      this._options.include,
      this._options.exclude
    );
  }

  transform(code, filepath) {
    let result;
    if (filepath.match(/\.svelte(?:$|\?)/i) && this._filter(filepath)) {
      result = app.extend(code, filepath, this._options.allowedMaxDepth);
    } else {
      result = null;
    }

    return result;
  }

  get options() {
    return this._options;
  }

  get name() {
    return this._name;
  }
}

module.exports = SvelteExtendRollupPlugin;
