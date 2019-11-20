const fs = require('fs-extra');
const Jimple = require('jimple');

const { appLogger } = require('wootils/node/logger');
const services = require('../services');

class SvelteExtend extends Jimple {
  constructor() {
    super();

    this.register(appLogger);
    this.register(services.extender);
    this.register(services.jsMerger);
    this.register(services.sfcData);
    this.register(services.sfcParser);
  }

  extend(contents, filepath, maxDepth = 0) {
    return this.get('sfcParser').parse(
      contents,
      filepath,
      maxDepth
    )
    .then((sfc) => (
      sfc === null ?
        contents :
        this.get('extender').generate(sfc).render()
    ));
  }

  extendFromPath(filepath, maxDepth = 0) {
    return fs.readFile(filepath, 'utf-8')
    .then((contents) => this.extend(contents, filepath, maxDepth));
  }
}

module.exports = SvelteExtend;
