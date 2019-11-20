const services = {};
const servicesAsFunctions = {};

const mocks = {
  set: jest.fn(),
  get: jest.fn((name) => {
    if (!services[name]) {
      throw new Error(`Identifier "${name}" is not defined.`);
    }

    const result = services[name];

    return servicesAsFunctions[name] ?
      result() :
      result;
  }),
  register: jest.fn(),
  factory: jest.fn((fn) => fn()),
};

class JimpleMock {
  static mock(name, mock) {
    mocks[name] = mock;
  }

  static service(name, mock, asFunction = false) {
    services[name] = mock;
    servicesAsFunctions[name] = asFunction;
  }

  static reset() {
    Object.keys(mocks).forEach((name) => {
      mocks[name].mockClear();
    });

    Object.keys(services).forEach((name) => {
      delete services[name];
      delete servicesAsFunctions[name];
    });
  }

  static provider(register) {
    return register;
  }

  constructor() {
    this.set = mocks.set;
    this.get = mocks.get;
    this.register = mocks.register;
    this.factory = mocks.factory;
  }
}

module.exports = JimpleMock;
