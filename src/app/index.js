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
}

module.exports = SvelteExtend;
