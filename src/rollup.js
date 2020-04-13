const rollupUtils = require('@rollup/pluginutils');
const app = require('./index');

/**
 * @typedef {function} RollupFilter
 * @param {String} filepath The path to validate.
 * @return {Boolean} Whether or not the path is valid.
 */

/**
 * @typedef {Object} SvelteExtendRollupPluginOptions
 * @property {Number} [allowedMaxDepth=0] How many components level can be extended. For example,
 *                                        if a file extends from one that extends from another
 *                                        and this is set to `1`, the parsing will fail.
 * @property {Array}  [include=[]]        A list of expressions the name of a file should match in
 *                                        order to be processed by the plugin.
 * @property {Array}  [exclude=[]]        A list of expressions the name of a file shouldn't match
 *                                        in order to be processed by the plugin.
 */

/**
 * The plugin that implements {@link SvelteExtend} for Rollup.
 */
class SvelteExtendRollupPlugin {
  /**
   * A shorthand static method to create a new instance of the plugin.
   * @param {SvelteExtendRollupPluginOptions} [options] The plugin options.
   * @param {String}                          [name]    The plugin instance's name.
   * @return {SvelteExtendRollupPlugin}
   * @static
   */
  static svelteExtend(options, name) {
    return new SvelteExtendRollupPlugin(options, name);
  }
  /**
   * @param {SvelteExtendRollupPluginOptions} [options={}]
   * The plugin options.
   * @param {String} [name='svelte-extend-rollup-plugin']
   * The plugin instance's name.
   */
  constructor(options = {}, name = 'svelte-extend-rollup-plugin') {
    /**
     * The plugin options.
     * @type {SvelteExtendRollupPluginOptions}
     * @access protected
     * @ignore
     */
    this._options = Object.assign(
      {
        allowedMaxDepth: 0,
        include: [],
        exclude: [],
      },
      options
    );
    /**
     * The plugin instance's name.
     * @type {String}
     * @access protected
     * @ignore
     */
    this._name = name;
    /**
     * The filter to decide which files will be processed and which won't.
     * @type {RollupFilter}
     * @access protected
     * @ignore
     */
    this._filter = rollupUtils.createFilter(
      this._options.include,
      this._options.exclude
    );
  }
  /**
   * The method Rollup calls when processing a file. It first validates if the file matches
   * the filter and then calls {@link SvelteExtend#extend}.
   * @param {String} code      The file contents.
   * @param {String} filepath  The file path.
   * @return {?Promise<String,Error>} If the file can't be processed, it will return `null`.
   */
  transform(code, filepath) {
    let result;
    if (filepath.match(/\.svelte(?:$|\?)/i) && this._filter(filepath)) {
      result = app.extend(code, filepath, this._options.allowedMaxDepth);
    } else {
      result = null;
    }

    return result;
  }
  /**
   * The plugin options.
   * @type {SvelteExtendRollupPluginOptions}
   */
  get options() {
    return this._options;
  }
  /**
   * The plugin instance's name.
   * @type {String}
   */
  get name() {
    return this._name;
  }
}

module.exports = SvelteExtendRollupPlugin;
