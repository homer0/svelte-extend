const fs = require('fs-extra');
const Jimple = require('jimple');

const {
  errorHandler,
  appLogger,
} = require('wootils/node/providers');
const services = require('../services');

class SvelteExtend extends Jimple {
  constructor() {
    super();

    this.register(errorHandler);
    this.register(appLogger);
    this.register(services.extender);
    this.register(services.jsMerger);
    this.register(services.sfcData);
    this.register(services.sfcParser);
  }

  extendFromPath(filepath, maxDepth = 0) {
    return fs.readFile(filepath, 'utf-8')
    .then((contents) => this.extend(contents, filepath, maxDepth));
  }

  extend(contents, filepath, maxDepth = 0) {
    return this.get('sfcParser').parse(
      contents,
      filepath,
      maxDepth
    )
    .then((sfc) => this.get('extender').generate(sfc))
    .then((result) => result.render());
  }
}

module.exports = SvelteExtend;
