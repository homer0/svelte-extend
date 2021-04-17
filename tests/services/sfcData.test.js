const path = require('path');
const JimpleMock = require('/tests/mocks/jimple.mock');

jest.mock('jimple', () => JimpleMock);
jest.unmock('/src/services/sfcData');

require('jasmine-expect');
const { SFCData, sfcData } = require('/src/services/sfcData');

describe('SFCData', () => {
  it('should be instantiated with a filepath and generate a directory path', () => {
    // Given
    const directoryPath = '/some/directory';
    const filepath = path.join(directoryPath, 'some-file.svelte');
    let sut = null;
    // When
    sut = new SFCData(filepath);
    // Then
    expect(sut).toBeInstanceOf(SFCData);
    expect(sut.filepath).toBe(filepath);
    expect(sut.directory).toBe(directoryPath);
    expect(sut.hasBaseFileData).toBeFalse();
    expect(sut.hasStyles).toBeFalse();
    expect(sut.hasScripts).toBeFalse();
    expect(sut.hasModuleScripts).toBeFalse();
  });

  it('should be instantiated with the shorthand static method', () => {
    // Given
    const directoryPath = '/some/directory';
    const filepath = path.join(directoryPath, 'some-file.svelte');
    let sut = null;
    // When
    sut = SFCData.new(filepath);
    // Then
    expect(sut).toBeInstanceOf(SFCData);
    expect(sut.filepath).toBe(filepath);
    expect(sut.directory).toBe(directoryPath);
    expect(sut.hasBaseFileData).toBeFalse();
    expect(sut.baseFileData).toBeNull();
    expect(sut.hasStyles).toBeFalse();
    expect(sut.styles).toEqual([]);
    expect(sut.style).toEqual({
      content: '',
      attributes: {},
    });
    expect(sut.hasScripts).toBeFalse();
    expect(sut.scripts).toEqual([]);
    expect(sut.script).toEqual({
      content: '',
      attributes: {},
    });
    expect(sut.hasModuleScripts).toBeFalse();
    expect(sut.moduleScripts).toEqual([]);
    expect(sut.moduleScript).toEqual({
      content: '',
      attributes: {
        context: 'module',
      },
    });
  });

  it('should add the data of a SFC it extends', () => {
    // Given
    let sut = null;
    let base = null;
    // When
    base = SFCData.new('some/file/path.svelte');
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addBaseFileData(base);
    // Then
    expect(sut.hasBaseFileData).toBeTrue();
    expect(sut.baseFileData).toBe(base);
  });

  it('should add the data of a SFC it extends and add the extend tag attributes', () => {
    // Given
    const extendTagAttributes = {
      extend: true,
    };
    let sut = null;
    let base = null;
    // When
    base = SFCData.new('some/file/path.svelte');
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addBaseFileData(base, extendTagAttributes);
    // Then
    expect(sut.hasBaseFileData).toBeTrue();
    expect(sut.baseFileData).toBe(base);
    expect(sut.extendTagAttributes).toBe(extendTagAttributes);
  });

  it('should throw an error when trying to add more than one base data', () => {
    // Given
    let sut = null;
    // When/Then
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addBaseFileData(SFCData.new('some/file/path.svelte'));
    expect(() => sut.addBaseFileData(SFCData.new('some/file/path.svelte'))).toThrow(
      /You can't add more than one base file data/i,
    );
  });

  it('should throw an error when trying to add data from an invalid object', () => {
    // Given
    let sut = null;
    // When/Then
    sut = SFCData.new('some/other/file/path.svelte');
    expect(() => sut.addBaseFileData({})).toThrow(/must be an instance of SFCData/i);
  });

  it('should add markup data', () => {
    // Given
    const markup = '<marquee>wooooo</marquee>';
    let sut = null;
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addMarkup(markup);
    // Then
    expect(sut.markup).toBe(markup);
  });

  it('should append new markup data', () => {
    // Given
    const baseMarkup = '<marquee>wooooo</marquee>';
    const addedMarkup = '<font face="verdana">weeee</font>';
    let sut = null;
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addMarkup(baseMarkup);
    sut.addMarkup(addedMarkup);
    // Then
    expect(sut.markup).toBe(`${baseMarkup}\n${addedMarkup}`);
  });

  it('should add a script data', () => {
    // Given
    const content = 'alert(window);';
    let sut = null;
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addScript(content);
    // Then
    expect(sut.hasScripts).toBeTrue();
    expect(sut.scripts).toEqual([
      {
        content,
        attributes: {},
      },
    ]);
    expect(sut.script).toEqual({
      content,
      attributes: {},
    });
  });

  it('should add a script data with tag attributes', () => {
    // Given
    const content = 'alert(window);';
    const attributes = {
      magic: true,
    };
    let sut = null;
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addScript(content, attributes);
    // Then
    expect(sut.hasScripts).toBeTrue();
    expect(sut.scripts).toEqual([
      {
        content,
        attributes,
      },
    ]);
  });

  it('should return all the scripts merged into one', () => {
    // Given
    const contentOne = 'alert(window);';
    const contentTwo = 'window.close();';
    const attributesTwo = {
      magic: true,
    };
    const contentThree = 'doMagic();';
    const attributesThree = {
      cosmic: true,
    };
    let sut = null;
    let result = null;
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addScript(contentOne);
    sut.addScript(contentTwo, attributesTwo);
    sut.addScript(contentThree, attributesThree);
    result = sut.script;
    // Then
    expect(result).toEqual({
      content: [contentOne, contentTwo, contentThree].join('\n'),
      attributes: Object.assign({}, attributesTwo, attributesThree),
    });
  });

  it('should add a module script data', () => {
    // Given
    const content = 'alert(window);';
    const attributes = {
      context: 'module',
    };
    let sut = null;
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addScript(content, attributes);
    // Then
    expect(sut.hasScripts).toBeFalse();
    expect(sut.hasModuleScripts).toBeTrue();
    expect(sut.moduleScripts).toEqual([
      {
        content,
        attributes,
      },
    ]);
    expect(sut.moduleScript).toEqual({
      content,
      attributes,
    });
  });

  it('should add styling data', () => {
    // Given
    const content = 'a { color: red; }';
    let sut = null;
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addStyle(content);
    // Then
    expect(sut.hasStyles).toBeTrue();
    expect(sut.styles).toEqual([
      {
        content,
        attributes: {},
      },
    ]);
    expect(sut.style).toEqual({
      content,
      attributes: {},
    });
  });

  it('should add styling data with tag attributes', () => {
    // Given
    const content = 'a { color: red; }';
    const attributes = {
      magic: true,
    };
    let sut = null;
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addStyle(content, attributes);
    // Then
    expect(sut.hasStyles).toBeTrue();
    expect(sut.styles).toEqual([
      {
        content,
        attributes,
      },
    ]);
  });

  it('should render a SFC component', () => {
    // Given
    const scriptData = {
      content: 'alert(window);',
    };
    const moduleScriptData = {
      content: 'window.close()',
      attributes: {
        context: 'module',
      },
    };
    const styleData = {
      content: 'a { color: red; }',
    };
    const markup = '<marquee>woooo</marquee>';
    let sut = null;
    let result = null;
    const expectedResult = [
      '<script context="module">',
      moduleScriptData.content,
      '</script>',
      '<script>',
      scriptData.content,
      '</script>',
      '<style>',
      styleData.content,
      '</style>',
      markup,
    ].join('\n');
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addScript(scriptData.content);
    sut.addScript(moduleScriptData.content, moduleScriptData.attributes);
    sut.addStyle(styleData.content);
    sut.addMarkup(markup);
    result = sut.render();
    // Then
    expect(result).toBe(expectedResult);
  });

  it('should render a SFC component without module scripts', () => {
    // Given
    const scriptData = {
      content: 'alert(window);',
    };
    const styleData = {
      content: 'a { color: red; }',
    };
    const markup = '<marquee>woooo</marquee>';
    let sut = null;
    let result = null;
    const expectedResult = [
      '<script>',
      scriptData.content,
      '</script>',
      '<style>',
      styleData.content,
      '</style>',
      markup,
    ].join('\n');
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addScript(scriptData.content);
    sut.addStyle(styleData.content);
    sut.addMarkup(markup);
    result = sut.render();
    // Then
    expect(result).toBe(expectedResult);
  });

  it('should render a SFC component without scripts', () => {
    // Given
    const styleData = {
      content: 'a { color: red; }',
    };
    const markup = '<marquee>woooo</marquee>';
    let sut = null;
    let result = null;
    const expectedResult = ['<style>', styleData.content, '</style>', markup].join('\n');
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addStyle(styleData.content);
    sut.addMarkup(markup);
    result = sut.render();
    // Then
    expect(result).toBe(expectedResult);
  });

  it('should render a SFC component without styling', () => {
    // Given
    const markup = '<marquee>woooo</marquee>';
    let sut = null;
    let result = null;
    // When
    sut = SFCData.new('some/other/file/path.svelte');
    sut.addMarkup(markup);
    result = sut.render();
    // Then
    expect(result).toBe(markup);
  });

  it('should have a provider for the DI container', () => {
    // Given
    const app = {
      set: jest.fn(),
    };
    let sut = null;
    let serviceFn = null;
    // When
    sfcData(app);
    [[, serviceFn]] = app.set.mock.calls;
    sut = serviceFn();
    // Then
    expect(sut).toBe(SFCData);
    expect(app.set).toHaveBeenCalledTimes(1);
    expect(app.set).toHaveBeenCalledWith('sfcData', expect.any(Function));
  });
});
