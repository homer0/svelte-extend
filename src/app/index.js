const Jimple = require('jimple');

const { errorHandler } = require('wootils/node/errorHandler');
const services = require('../services');

class SvelteExtend extends Jimple {
  constructor() {
    super();

    this.register(errorHandler);
    this.register(services.sfcData);
    this.register(services.sfcParser);
  }
}

module.exports = SvelteExtend;
