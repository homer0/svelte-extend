const fs = require('fs-extra');
const Jimple = require('jimple');

const { appLogger } = require('wootils/node/logger');
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

    this.register(appLogger);
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
  extend(contents, filepath, maxDepth = 0) {
    return this.get('sfcParser')
      .parse(contents, filepath, maxDepth)
      .then((sfc) =>
        sfc === null ? contents : this.get('extender').generate(sfc).render(),
      );
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
  extendFromPath(filepath, maxDepth = 0) {
    return fs
      .readFile(filepath, 'utf-8')
      .then((contents) => this.extend(contents, filepath, maxDepth));
  }
}

module.exports = SvelteExtend;
