const path = require('path');
const JimpleMock = require('/tests/mocks/jimple.mock');

jest.mock('jimple', () => JimpleMock);
jest.unmock('/src/services/extender');

require('jasmine-expect');
const { Extender, extender } = require('/src/services/extender');

describe('Extender', () => {
  const getSFCs = () => {
    const baseDirectory = '/base/component';
    const baseFilepath = path.join(baseDirectory, 'base.svelte');
    const base = {
      hasBaseFileData: false,
      directory: baseDirectory,
      filepath: baseFilepath,
      hasModuleScripts: false,
      hasScripts: false,
      hasStyles: false,
      script: {
        content: 'base-script',
        attributes: {
          name: 'base-script',
        },
      },
      moduleScript: {
        content: 'base-module-script',
        attributes: {
          context: 'module',
          name: 'base-module-script',
        },
      },
      style: {
        content: 'base-style',
        attributes: {
          name: 'base-style',
        },
      },
    };
    const targetDirectory = '/target/component';
    const targetFilepath = path.join(targetDirectory, 'target.svelte');
    const target = {
      hasBaseFileData: true,
      baseFileData: base,
      directory: targetDirectory,
      filepath: targetFilepath,
      markup: 'target-markup',
      hasModuleScripts: false,
      hasScripts: false,
      hasStyles: false,
      script: {
        content: '',
        attributes: {},
      },
      moduleScript: {
        content: '',
        attributes: {},
      },
      style: {
        content: '',
        attributes: {},
      },
      extendTagAttributes: {},
    };

    return {
      base,
      target,
    };
  };

  it('should be instantiated', () => {
    // Given
    let sut = null;
    // When
    sut = new Extender();
    // Then
    expect(sut).toBeInstanceOf(Extender);
  });

  it('should extend a SFC', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should throw an error when trying to extend beyond the allowed depth', () => {
    // Given
    const jsMerger = 'jsMerger';
    const sfcData = 'sfcData';
    const { base, target } = getSFCs();
    base.hasBaseFileData = true;
    base.baseFileData = Object.assign({}, target);
    const maxDepth = 1;
    let sut = null;
    // When/Then
    sut = new Extender(jsMerger, sfcData);
    expect(() => sut.generate(target, maxDepth)).toThrow(/can't extend from another file/i);
  });

  it('should extend a SFC and keep the original markup', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    base.markup = 'base-markup';
    target.extendTagAttributes.html = true;
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup)
    .toHaveBeenCalledWith(`${base.markup}\n${target.markup}`);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and update the paths of the oringinal markup', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    const imageName = 'image.png';
    base.markup = `<img src="./${imageName}" />`;
    target.extendTagAttributes.html = true;
    let sut = null;
    let result = null;
    const expectedMarkup = [
      `<img src="../..${base.directory}/${imageName}" />`,
      target.markup,
    ].join('\n');
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(expectedMarkup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and update the paths of the oringinal markup (single quote)', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    const imageName = 'image.png';
    base.markup = `<img src='./${imageName}' />`;
    target.extendTagAttributes.html = true;
    let sut = null;
    let result = null;
    const expectedMarkup = [
      `<img src='../..${base.directory}/${imageName}' />`,
      target.markup,
    ].join('\n');
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(expectedMarkup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and put the base markup before the extended', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    base.markup = 'base-markup';
    target.extendTagAttributes.html = 'after';
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup)
    .toHaveBeenCalledWith(`${base.markup}\n${target.markup}`);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and put the base markup after the extended', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    base.markup = 'base-markup';
    target.extendTagAttributes.html = 'before';
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup)
    .toHaveBeenCalledWith(`${target.markup}\n${base.markup}`);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and fallback the markup position to after the base', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    base.markup = 'base-markup';
    target.extendTagAttributes.html = 'invalid';
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup)
    .toHaveBeenCalledWith(`${base.markup}\n${target.markup}`);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC without markup', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    base.markup = '';
    target.markup = '';
    target.extendTagAttributes.html = true;
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith('');
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and overwrite the original styling', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    target.hasStyles = true;
    target.style.content = 'target-style';
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      target.style.content,
      Object.assign(
        {},
        target.style.attributes,
        {
          extend: undefined,
        }
      )
    );
  });

  it('should extend a SFC and keep the original styling', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    target.hasStyles = true;
    target.style.attributes.extend = true;
    target.style.content = 'target-style';
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      `${base.style.content}\n${target.style.content}`,
      Object.assign(
        {},
        base.style.attributes,
        target.style.attributes,
        {
          extend: undefined,
        }
      )
    );
  });

  it('should extend a SFC and update the paths of the original styling', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    const imageName = 'image.svg';
    base.style.content = `a { background: url(./${imageName}); }`;
    target.hasStyles = true;
    target.style.attributes.extend = true;
    target.style.content = 'target-style';
    let sut = null;
    let result = null;
    const expectedStyling = [
      `a { background: url(../..${base.directory}/${imageName}); }`,
      target.style.content,
    ].join('\n');
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      expectedStyling,
      Object.assign(
        {},
        base.style.attributes,
        target.style.attributes,
        {
          extend: undefined,
        }
      )
    );
  });

  it('should extend a SFC and keep the original styling after the extended', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    target.hasStyles = true;
    target.style.attributes.extend = 'before';
    target.style.content = 'target-style';
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      `${target.style.content}\n${base.style.content}`,
      Object.assign(
        {},
        base.style.attributes,
        target.style.attributes,
        {
          extend: undefined,
        }
      )
    );
  });

  it('should extend a SFC without styling', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    base.style.content = '';
    target.hasStyles = false;
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(0);
  });

  it('should extend a SFC and overwrite the module script', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    target.hasModuleScripts = true;
    target.moduleScript.content = 'target-module-script';
    target.moduleScript.attributes.context = 'module';
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      target.moduleScript.content,
      target.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and merge an empty module script', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    base.moduleScript.content = '';
    target.hasModuleScripts = true;
    target.moduleScript.content = 'target-module-script';
    target.moduleScript.attributes.context = 'module';
    target.moduleScript.attributes.extend = true;
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      target.moduleScript.content,
      Object.assign(
        {},
        base.moduleScript.attributes,
        target.moduleScript.attributes,
        {
          extend: undefined,
        }
      )
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and merge a module script', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const merged = 'merged-code';
    const jsMerger = {
      mergeCode: jest.fn(() => merged),
    };
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    target.hasModuleScripts = true;
    target.moduleScript.content = 'target-module-script';
    target.moduleScript.attributes.context = 'module';
    target.moduleScript.attributes.extend = true;
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      merged,
      Object.assign(
        {},
        base.moduleScript.attributes,
        target.moduleScript.attributes,
        {
          extend: undefined,
        }
      )
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
    expect(jsMerger.mergeCode).toHaveBeenCalledTimes(1);
    expect(jsMerger.mergeCode).toHaveBeenCalledWith(
      base.moduleScript.content,
      target.moduleScript.content
    );
  });

  it('should extend a SFC without a module script', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    base.moduleScript.content = '';
    target.hasModuleScripts = true;
    target.moduleScript.content = '';
    target.moduleScript.attributes.context = 'module';
    target.moduleScript.attributes.extend = true;
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(1);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.script.content,
      base.script.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and overwrite the script', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    target.hasScripts = true;
    target.script.content = 'target-script';
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      target.script.content,
      target.script.attributes
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and merge an empty script', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    base.script.content = '';
    target.hasScripts = true;
    target.script.content = 'target-module-script';
    target.script.attributes.extend = true;
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      target.script.content,
      Object.assign(
        {},
        base.script.attributes,
        target.script.attributes,
        {
          extend: undefined,
        }
      )
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should extend a SFC and merge a script', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const merged = 'merged-code';
    const jsMerger = {
      mergeCode: jest.fn(() => merged),
    };
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    target.hasScripts = true;
    target.script.content = 'target-script';
    target.script.attributes.extend = true;
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      merged,
      Object.assign(
        {},
        base.script.attributes,
        target.script.attributes,
        {
          extend: undefined,
        }
      )
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
    expect(jsMerger.mergeCode).toHaveBeenCalledTimes(1);
    expect(jsMerger.mergeCode).toHaveBeenCalledWith(
      base.script.content,
      target.script.content
    );
  });

  it('should extend a SFC and update the paths of the original script', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = {
      mergeCode: jest.fn((a, b) => `${a}\n${b}`),
    };
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    const moduleName = 'my-module';
    base.script.content = `import './${moduleName}';`;
    target.hasScripts = true;
    target.script.content = 'target-script';
    target.script.attributes.extend = true;
    let sut = null;
    let result = null;
    const expectedBaseScript = `import '../..${base.directory}/${moduleName}';`;
    const expectedScript = [
      expectedBaseScript,
      target.script.content,
    ].join('\n');
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      expectedScript,
      Object.assign(
        {},
        base.script.attributes,
        target.script.attributes,
        {
          extend: undefined,
        }
      )
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
    expect(jsMerger.mergeCode).toHaveBeenCalledTimes(1);
    expect(jsMerger.mergeCode).toHaveBeenCalledWith(
      expectedBaseScript,
      target.script.content
    );
  });

  it('should extend a SFC and update the paths of the original script (require)', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = {
      mergeCode: jest.fn((a, b) => `${a}\n${b}`),
    };
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    const moduleName = 'my-module';
    base.script.content = `require('./${moduleName}');`;
    target.hasScripts = true;
    target.script.content = 'target-script';
    target.script.attributes.extend = true;
    let sut = null;
    let result = null;
    const expectedBaseScript = `require('../..${base.directory}/${moduleName}');`;
    const expectedScript = [
      expectedBaseScript,
      target.script.content,
    ].join('\n');
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(
      expectedScript,
      Object.assign(
        {},
        base.script.attributes,
        target.script.attributes,
        {
          extend: undefined,
        }
      )
    );
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
    expect(jsMerger.mergeCode).toHaveBeenCalledTimes(1);
    expect(jsMerger.mergeCode).toHaveBeenCalledWith(
      expectedBaseScript,
      target.script.content
    );
  });

  it('should extend a SFC without a script', () => {
    // Given
    const newData = {
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const jsMerger = 'jsMerger';
    const sfcData = {
      new: jest.fn(() => newData),
    };
    const { base, target } = getSFCs();
    base.script.content = '';
    target.hasScripts = true;
    target.script.content = '';
    target.script.attributes.extend = true;
    let sut = null;
    let result = null;
    // When
    sut = new Extender(jsMerger, sfcData);
    result = sut.generate(target);
    // Then
    expect(result).toBe(newData);
    expect(sfcData.new).toHaveBeenCalledTimes(1);
    expect(sfcData.new).toHaveBeenCalledWith(target.filepath);
    expect(newData.addMarkup).toHaveBeenCalledTimes(1);
    expect(newData.addMarkup).toHaveBeenCalledWith(target.markup);
    expect(newData.addScript).toHaveBeenCalledTimes(1);
    expect(newData.addScript).toHaveBeenCalledWith(
      base.moduleScript.content,
      base.moduleScript.attributes
    );
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(
      base.style.content,
      base.style.attributes
    );
  });

  it('should have a provider for the DI container', () => {
    // Given
    const app = {
      set: jest.fn(),
      get: jest.fn((service) => service),
    };
    let sut = null;
    let serviceFn = null;
    const expectedGets = [
      'jsMerger',
      'sfcData',
    ];
    // When
    extender(app);
    [[, serviceFn]] = app.set.mock.calls;
    sut = serviceFn();
    // Then
    expect(sut).toBeInstanceOf(Extender);
    expect(app.get).toHaveBeenCalledTimes(expectedGets.length);
    expectedGets.forEach((service) => {
      expect(app.get).toHaveBeenCalledWith(service);
    });
    expect(app.set).toHaveBeenCalledTimes(1);
    expect(app.set).toHaveBeenCalledWith('extender', expect.any(Function));
  });
});
