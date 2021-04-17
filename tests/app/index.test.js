const JimpleMock = require('/tests/mocks/jimple.mock');

const wootilsServices = {
  appLogger: 'wootils-appLogger',
};
const appServices = {
  extender: 'app-extender',
  jsMerger: 'app-jsMerger',
  sfcData: 'app-sfcData',
  sfcParser: 'app-sfcParser',
};
jest.mock('fs-extra');
jest.mock('jimple', () => JimpleMock);
jest.mock('wootils/node/logger', () => wootilsServices);
jest.mock('/src/services', () => appServices);
jest.unmock('/src/app/index');

require('jasmine-expect');

const fs = require('fs-extra');
const SvelteExtend = require('/src/app');

describe('SvelteExtend', () => {
  beforeEach(() => {
    fs.readFile.mockReset();
    JimpleMock.reset();
  });

  it('should be instantiated and register the services', () => {
    // Given
    let sut = null;
    const expectedServices = [
      wootilsServices.appLogger,
      appServices.extender,
      appServices.jsMerger,
      appServices.sfcData,
      appServices.sfcParser,
    ];
    // When
    sut = new SvelteExtend();
    // Then
    expect(sut).toBeInstanceOf(SvelteExtend);
    expect(sut.register).toHaveBeenCalledTimes(expectedServices.length);
    expectedServices.forEach((service) => {
      expect(sut.register).toHaveBeenCalledWith(service);
    });
  });

  it('should extend a component', () => {
    // Given
    const parsed = 'parsed!';
    const sfcParser = {
      parse: jest.fn(() => Promise.resolve(parsed)),
    };
    JimpleMock.service('sfcParser', sfcParser);
    const final = 'final component';
    const extended = {
      render: jest.fn(() => final),
    };
    const extender = {
      generate: jest.fn(() => extended),
    };
    JimpleMock.service('extender', extender);
    const contents = 'some file content';
    const filepath = 'some/file/path';
    let sut = null;
    // When
    sut = new SvelteExtend();
    return sut.extend(contents, filepath).then((result) => {
      // Then
      expect(result).toBe(final);
      expect(sut.get).toHaveBeenCalledTimes(2);
      expect(sut.get).toHaveBeenCalledWith('sfcParser');
      expect(sut.get).toHaveBeenCalledWith('extender');
      expect(sfcParser.parse).toHaveBeenCalledTimes(1);
      expect(sfcParser.parse).toHaveBeenCalledWith(contents, filepath, 0);
      expect(extender.generate).toHaveBeenCalledTimes(1);
      expect(extender.generate).toHaveBeenCalledWith(parsed);
      expect(extended.render).toHaveBeenCalledTimes(1);
    });
  });

  it('should extend a component with custom max depth', () => {
    // Given
    const parsed = 'parsed!';
    const sfcParser = {
      parse: jest.fn(() => Promise.resolve(parsed)),
    };
    JimpleMock.service('sfcParser', sfcParser);
    const final = 'final component';
    const extended = {
      render: jest.fn(() => final),
    };
    const extender = {
      generate: jest.fn(() => extended),
    };
    JimpleMock.service('extender', extender);
    const contents = 'some file content';
    const filepath = 'some/file/path';
    const maxDepth = 12;
    let sut = null;
    // When
    sut = new SvelteExtend();
    return sut.extend(contents, filepath, maxDepth).then((result) => {
      // Then
      expect(result).toBe(final);
      expect(sut.get).toHaveBeenCalledTimes(2);
      expect(sut.get).toHaveBeenCalledWith('sfcParser');
      expect(sut.get).toHaveBeenCalledWith('extender');
      expect(sfcParser.parse).toHaveBeenCalledTimes(1);
      expect(sfcParser.parse).toHaveBeenCalledWith(contents, filepath, maxDepth);
      expect(extender.generate).toHaveBeenCalledTimes(1);
      expect(extender.generate).toHaveBeenCalledWith(parsed);
      expect(extended.render).toHaveBeenCalledTimes(1);
    });
  });

  it("shouldn't extend a component because that can't be parsed", () => {
    // Given
    const sfcParser = {
      parse: jest.fn(() => Promise.resolve(null)),
    };
    JimpleMock.service('sfcParser', sfcParser);
    const extender = {
      generate: jest.fn(),
    };
    JimpleMock.service('extender', extender);
    const contents = 'some file content';
    const filepath = 'some/file/path';
    let sut = null;
    // When
    sut = new SvelteExtend();
    return sut.extend(contents, filepath).then((result) => {
      // Then
      expect(result).toBe(contents);
      expect(sut.get).toHaveBeenCalledTimes(1);
      expect(sut.get).toHaveBeenCalledWith('sfcParser');
      expect(sfcParser.parse).toHaveBeenCalledTimes(1);
      expect(sfcParser.parse).toHaveBeenCalledWith(contents, filepath, 0);
      expect(extender.generate).toHaveBeenCalledTimes(0);
    });
  });

  it('should extend a component from its path', () => {
    // Given
    const contents = 'some file content';
    fs.readFile.mockImplementationOnce(() => Promise.resolve(contents));
    const parsed = 'parsed!';
    const sfcParser = {
      parse: jest.fn(() => Promise.resolve(parsed)),
    };
    JimpleMock.service('sfcParser', sfcParser);
    const final = 'final component';
    const extended = {
      render: jest.fn(() => final),
    };
    const extender = {
      generate: jest.fn(() => extended),
    };
    JimpleMock.service('extender', extender);
    const filepath = 'some/file/path';
    let sut = null;
    // When
    sut = new SvelteExtend();
    return sut.extendFromPath(filepath).then((result) => {
      // Then
      expect(result).toBe(final);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
      expect(fs.readFile).toHaveBeenCalledWith(filepath, 'utf-8');
      expect(sut.get).toHaveBeenCalledTimes(2);
      expect(sut.get).toHaveBeenCalledWith('sfcParser');
      expect(sut.get).toHaveBeenCalledWith('extender');
      expect(sfcParser.parse).toHaveBeenCalledTimes(1);
      expect(sfcParser.parse).toHaveBeenCalledWith(contents, filepath, 0);
      expect(extender.generate).toHaveBeenCalledTimes(1);
      expect(extender.generate).toHaveBeenCalledWith(parsed);
      expect(extended.render).toHaveBeenCalledTimes(1);
    });
  });

  it('should extend a component from its path, with custom max depth', () => {
    // Given
    const contents = 'some file content';
    fs.readFile.mockImplementationOnce(() => Promise.resolve(contents));
    const parsed = 'parsed!';
    const sfcParser = {
      parse: jest.fn(() => Promise.resolve(parsed)),
    };
    JimpleMock.service('sfcParser', sfcParser);
    const final = 'final component';
    const extended = {
      render: jest.fn(() => final),
    };
    const extender = {
      generate: jest.fn(() => extended),
    };
    JimpleMock.service('extender', extender);
    const maxDepth = 12;
    const filepath = 'some/file/path';
    let sut = null;
    // When
    sut = new SvelteExtend();
    return sut.extendFromPath(filepath, maxDepth).then((result) => {
      // Then
      expect(result).toBe(final);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
      expect(fs.readFile).toHaveBeenCalledWith(filepath, 'utf-8');
      expect(sut.get).toHaveBeenCalledTimes(2);
      expect(sut.get).toHaveBeenCalledWith('sfcParser');
      expect(sut.get).toHaveBeenCalledWith('extender');
      expect(sfcParser.parse).toHaveBeenCalledTimes(1);
      expect(sfcParser.parse).toHaveBeenCalledWith(contents, filepath, maxDepth);
      expect(extender.generate).toHaveBeenCalledTimes(1);
      expect(extender.generate).toHaveBeenCalledWith(parsed);
      expect(extended.render).toHaveBeenCalledTimes(1);
    });
  });
});
