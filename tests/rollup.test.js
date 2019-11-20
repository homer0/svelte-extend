jest.mock('rollup-pluginutils');
jest.unmock('/src/rollup');

const rollupUtils = require('rollup-pluginutils');
require('jasmine-expect');
const app = require('/src/index');

const SvelteExtendRollupPlugin = require('/src/rollup');

describe('integrations:Rollup', () => {
  beforeEach(() => {
    app.extend.mockReset();
    rollupUtils.createFilter.mockReset();
  });

  it('should be instantiated with its default options', () => {
    // Given
    let sut = null;
    // When
    sut = new SvelteExtendRollupPlugin();
    // Then
    expect(sut).toBeInstanceOf(SvelteExtendRollupPlugin);
    expect(sut.options).toEqual({
      allowedMaxDepth: 0,
      include: [],
      exclude: [],
    });
    expect(sut.name).toBe('svelte-extend-rollup-plugin');
    expect(sut.transform).toBeFunction();
    expect(rollupUtils.createFilter).toHaveBeenCalledTimes(1);
    expect(rollupUtils.createFilter).toHaveBeenCalledWith([], []);
  });

  it('should be instantiated with custom options and name', () => {
    // Given
    const options = {
      allowedMaxDepth: 12,
      include: ['include'],
      exclude: ['exclude'],
    };
    const name = 'my-extend-plugin';
    let sut = null;
    // When
    sut = new SvelteExtendRollupPlugin(options, name);
    // Then
    expect(sut).toBeInstanceOf(SvelteExtendRollupPlugin);
    expect(sut.options).toEqual(options);
    expect(sut.name).toBe(name);
    expect(sut.transform).toBeFunction();
    expect(rollupUtils.createFilter).toHaveBeenCalledTimes(1);
    expect(rollupUtils.createFilter).toHaveBeenCalledWith(
      options.include,
      options.exclude
    );
  });

  it('should be instantiated using the shorthand static method', () => {
    // Given
    let sut = null;
    // When
    sut = SvelteExtendRollupPlugin.svelteExtend();
    // Then
    expect(sut).toBeInstanceOf(SvelteExtendRollupPlugin);
    expect(sut.options).toEqual({
      allowedMaxDepth: 0,
      include: [],
      exclude: [],
    });
    expect(sut.name).toBe('svelte-extend-rollup-plugin');
    expect(sut.transform).toBeFunction();
    expect(rollupUtils.createFilter).toHaveBeenCalledTimes(1);
    expect(rollupUtils.createFilter).toHaveBeenCalledWith([], []);
  });

  it('should transform a file', () => {
    // Given
    const filter = jest.fn(() => true);
    rollupUtils.createFilter.mockImplementationOnce(() => filter);
    const transformed = 'transformed!';
    app.extend.mockImplementationOnce(() => transformed);
    const code = 'the code';
    const filepath = '/some/file.svelte';
    let sut = null;
    let result = null;
    // When
    sut = SvelteExtendRollupPlugin.svelteExtend();
    result = sut.transform(code, filepath);
    // Then
    expect(result).toBe(transformed);
    expect(filter).toHaveBeenCalledTimes(1);
    expect(filter).toHaveBeenCalledWith(filepath);
    expect(app.extend).toHaveBeenCalledTimes(1);
    expect(app.extend).toHaveBeenCalledWith(code, filepath, 0);
  });

  it('should transform a file with a custom max depth option', () => {
    // Given
    const filter = jest.fn(() => true);
    rollupUtils.createFilter.mockImplementationOnce(() => filter);
    const transformed = 'transformed!';
    app.extend.mockImplementationOnce(() => transformed);
    const code = 'the code';
    const filepath = '/some/file.svelte';
    const allowedMaxDepth = 12;
    let sut = null;
    let result = null;
    // When
    sut = SvelteExtendRollupPlugin.svelteExtend({ allowedMaxDepth });
    result = sut.transform(code, filepath);
    // Then
    expect(result).toBe(transformed);
    expect(filter).toHaveBeenCalledTimes(1);
    expect(filter).toHaveBeenCalledWith(filepath);
    expect(app.extend).toHaveBeenCalledTimes(1);
    expect(app.extend).toHaveBeenCalledWith(code, filepath, allowedMaxDepth);
  });

  it('should ignore a file because it doesn\'t have a .svelte extension', () => {
    // Given
    const filter = jest.fn();
    rollupUtils.createFilter.mockImplementationOnce(() => filter);
    const code = 'the code';
    const filepath = '/some/file.js';
    let sut = null;
    let result = null;
    // When
    sut = SvelteExtendRollupPlugin.svelteExtend();
    result = sut.transform(code, filepath);
    // Then
    expect(result).toBeNull();
    expect(filter).toHaveBeenCalledTimes(0);
    expect(app.extend).toHaveBeenCalledTimes(0);
  });

  it('should ignore a file because it doesn\'t match the filter', () => {
    // Given
    const filter = jest.fn(() => false);
    rollupUtils.createFilter.mockImplementationOnce(() => filter);
    const code = 'the code';
    const filepath = '/some/file.svelte';
    let sut = null;
    let result = null;
    // When
    sut = SvelteExtendRollupPlugin.svelteExtend();
    result = sut.transform(code, filepath);
    // Then
    expect(result).toBeNull();
    expect(filter).toHaveBeenCalledTimes(1);
    expect(filter).toHaveBeenCalledWith(filepath);
    expect(app.extend).toHaveBeenCalledTimes(0);
  });
});
