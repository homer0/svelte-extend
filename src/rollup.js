const rollupUtils = require('@rollup/pluginutils');
const app = require('./index');

/**
 * @callback RollupFilter
 * @param {string} filepath  The path to validate.
 * @returns {boolean} Whether or not the path is valid.
 */

/**
 * @typedef {Object} SvelteExtendRollupPluginOptions
 * @property {number} [allowedMaxDepth=0]  How many components level can be extended. For
 *                                         example,
 *                                         if a file extends from one that extends from
 *                                         another and this is set to `1`, the parsing
 *                                         will fail.
 * @property {Array}  [include=[]]         A list of expressions the name of a file should
 *                                         match in order to be processed by the plugin.
 * @property {Array}  [exclude=[]]         A list of expressions the name of a file
 *                                         shouldn't match in order to be processed by the
 *                                         plugin.
 */

/**
 * The plugin that implements {@link SvelteExtend} for Rollup.
 */
class SvelteExtendRollupPlugin {
  /**
   * A shorthand static method to create a new instance of the plugin.
   *
   * @param {SvelteExtendRollupPluginOptions} [options]
   * The plugin options.
   * @param {string} [name]
   * The plugin instance's name.
   * @returns {SvelteExtendRollupPlugin}
   * @static
   */
  static svelteExtend(options, name) {
    return new SvelteExtendRollupPlugin(options, name);
  }
  /**
   * @param {SvelteExtendRollupPluginOptions} [options={}]
   * The plugin options.
   * @param {string} [name='svelte-extend-rollup-plugin']
   * The plugin instance's name.
   */
  constructor(options = {}, name = 'svelte-extend-rollup-plugin') {
    /**
     * The plugin options.
     *
     * @type {SvelteExtendRollupPluginOptions}
     * @access protected
     * @ignore
     */
    this._options = {
      allowedMaxDepth: 0,
      include: [],
      exclude: [],
      ...options,
    };
    /**
     * The plugin instance's name.
     *
     * @type {string}
     * @access protected
     * @ignore
     */
    this._name = name;
    /**
     * The filter to decide which files will be processed and which won't.
     *
     * @type {RollupFilter}
     * @access protected
     * @ignore
     */
    this._filter = rollupUtils.createFilter(this._options.include, this._options.exclude);
    /**
     * @ignore
     */
    this.transform = this.transform.bind(this);
  }
  /**
   * Get the plugin current options.
   *
   * @type {SvelteExtendRollupPluginOptions}
   */
  getOptions() {
    return this._options;
  }
  /**
   * The method Rollup calls when processing a file. It first validates if the file
   * matches the filter and then calls {@link SvelteExtend#extend}.
   *
   * @param {string} code      The file contents.
   * @param {string} filepath  The file path.
   * @returns {?Promise<string, Error>} If the file can't be processed, it will return
   *                                    `null`.
   */
  transform(code, filepath) {
    let result;
    if (filepath.match(/\.svelte(?:$|\?)/i) && this._filter(filepath)) {
      result = {
        code: app.extend(code, filepath, this._options.allowedMaxDepth),
        map: null,
      };
    } else {
      result = null;
    }

    return result;
  }
  /**
   * The plugin instance's name.
   *
   * @type {string}
   */
  get name() {
    return this._name;
  }
}

module.exports = SvelteExtendRollupPlugin;
