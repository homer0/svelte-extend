jest.unmock('../src/webpack');

const app = require('../src/index');

const svelteExtendWebpackLoader = require('../src/webpack');

describe('integrations:webpack', () => {
  beforeEach(() => {
    app.extend.mockReset();
  });

  it('should process a file', () => {
    // Given
    const callback = jest.fn();
    const context = {
      resourcePath: 'resource-path',
      async: jest.fn(() => callback),
      getOptions: jest.fn(),
    };
    const result = 'formatted!';
    const fakePromise = {
      then: jest.fn((fn) => {
        fn(result);
        return fakePromise;
      }),
      catch: jest.fn(),
    };
    app.extend.mockImplementationOnce(() => fakePromise);
    const source = 'source';
    // When
    svelteExtendWebpackLoader.bind(context)(source);
    // Then
    expect(context.getOptions).toHaveBeenCalledTimes(1);
    expect(context.async).toHaveBeenCalledTimes(1);
    expect(app.extend).toHaveBeenCalledTimes(1);
    expect(app.extend).toHaveBeenCalledWith(source, context.resourcePath, 0);
    expect(fakePromise.then).toHaveBeenCalledTimes(1);
    expect(fakePromise.then).toHaveBeenCalledWith(expect.any(Function));
    expect(fakePromise.catch).toHaveBeenCalledTimes(1);
    expect(fakePromise.catch).toHaveBeenCalledWith(expect.any(Function));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(null, result);
  });

  it('should process a file with a custom max depth option', () => {
    // Given
    const allowedMaxDepth = 12;
    const callback = jest.fn();
    const context = {
      resourcePath: 'resource-path',
      async: jest.fn(() => callback),
      getOptions: jest.fn(() => ({
        allowedMaxDepth,
      })),
    };
    const result = 'formatted!';
    const fakePromise = {
      then: jest.fn((fn) => {
        fn(result);
        return fakePromise;
      }),
      catch: jest.fn(),
    };
    app.extend.mockImplementationOnce(() => fakePromise);
    const source = 'source';
    // When
    svelteExtendWebpackLoader.bind(context)(source);
    // Then
    expect(context.getOptions).toHaveBeenCalledTimes(1);
    expect(context.async).toHaveBeenCalledTimes(1);
    expect(app.extend).toHaveBeenCalledTimes(1);
    expect(app.extend).toHaveBeenCalledWith(
      source,
      context.resourcePath,
      allowedMaxDepth,
    );
    expect(fakePromise.then).toHaveBeenCalledTimes(1);
    expect(fakePromise.then).toHaveBeenCalledWith(expect.any(Function));
    expect(fakePromise.catch).toHaveBeenCalledTimes(1);
    expect(fakePromise.catch).toHaveBeenCalledWith(expect.any(Function));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(null, result);
  });

  it('should fail to process a file', () => {
    // Given
    const callback = jest.fn();
    const context = {
      resourcePath: 'resource-path',
      async: jest.fn(() => callback),
      getOptions: jest.fn(),
    };
    const error = new Error('DAMN');
    const fakePromise = {
      then: jest.fn(() => fakePromise),
      catch: jest.fn((fn) => {
        fn(error);
      }),
    };
    app.extend.mockImplementationOnce(() => fakePromise);
    const source = 'source';
    // When
    svelteExtendWebpackLoader.bind(context)(source);
    // Then
    expect(context.getOptions).toHaveBeenCalledTimes(1);
    expect(context.async).toHaveBeenCalledTimes(1);
    expect(app.extend).toHaveBeenCalledTimes(1);
    expect(app.extend).toHaveBeenCalledWith(source, context.resourcePath, 0);
    expect(fakePromise.then).toHaveBeenCalledTimes(1);
    expect(fakePromise.then).toHaveBeenCalledWith(expect.any(Function));
    expect(fakePromise.catch).toHaveBeenCalledTimes(1);
    expect(fakePromise.catch).toHaveBeenCalledWith(expect.any(Function));
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(error);
  });
});
