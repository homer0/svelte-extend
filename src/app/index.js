const fs = require('fs/promises');
const { Jimple } = require('@homer0/jimple');

const { appLoggerProvider } = require('@homer0/simple-logger');
const services = require('../services');

/**
 * The application main interface and dependency injection container.
 *
 * @augments {Jimple}
 */
class SvelteExtend extends Jimple {
  /**
   * @ignore
   */
  constructor() {
    super();

    this.register(appLoggerProvider);
    this.register(services.extender);
    this.register(services.jsMerger);
    this.register(services.sfcData);
    this.register(services.sfcParser);
  }
  /**
   * Extends an Svelte single file component that implements the `<extend />` tag.
   *
   * @param {string} contents      The contents of the file.
   * @param {string} filepath      The path of the file.
   * @param {number} [maxDepth=0]  How many components can be extended. For example, if a
   *                               file extends from one that extends from another and the
   *                               parameter is set to `1`, the parsing will fail.
   * @returns {Promise<?string, Error>} If the file doesn't implement the `<extend />`
   *                                    tag, the promise will resolve with `null`.
   */
  async extend(contents, filepath, maxDepth = 0) {
    const sfc = await this.get('sfcParser').parse(contents, filepath, maxDepth);
    if (sfc === null) {
      return contents;
    }

    const extended = this.get('extender').generate(sfc);
    return extended.render();
  }
  /**
   * Extends an Svelte single file component that implements the `<extend />` tag by using
   * just its path; once the file is loaded, the method will internally call
   * {@link SvelteExtend#extend}.
   *
   * @param {string} filepath      The path of the file.
   * @param {number} [maxDepth=0]  How many components can be extended. For example, if a
   *                               file extends from one that extends from another and the
   *                               parameter is set to `1`, the parsing will fail.
   * @returns {Promise<?string, Error>} If the file doesn't implement the `<extend />`
   *                                    tag, the promise will resolve with `null`.
   */
  async extendFromPath(filepath, maxDepth = 0) {
    const contents = await fs.readFile(filepath, 'utf-8');
    return this.extend(contents, filepath, maxDepth);
  }
}

module.exports = SvelteExtend;
