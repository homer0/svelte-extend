/* eslint-disable max-classes-per-file */
jest.mock('fs/promises');
// eslint-disable-next-line global-require
jest.mock('@homer0/jimple', () => require('../mocks/jimple.mock'));
jest.unmock('../../src/services/sfcParser');

const fs = require('fs/promises');
const { SFCParser, sfcParser } = require('../../src/services/sfcParser');

describe('SFCParser', () => {
  beforeEach(() => {
    fs.access.mockReset();
    fs.readFile.mockReset();
  });

  it('should be instantiated', () => {
    // Given
    let sut = null;
    // When
    sut = new SFCParser();
    // Then
    expect(sut).toBeInstanceOf(SFCParser);
  });

  it("shouldn't parse a file that doesn't have an extend tag", () => {
    let sut = null;
    sut = new SFCParser();
    return sut.parse('<marquee>daaaamn</marquee>', '/some/file/path').then((result) => {
      expect(result).toBeNull();
    });
  });

  it("should fail to parse a file if the base file doesn't exist", async () => {
    const baseFile = 'base.svelte';
    const targetFile = 'target.svelte';
    const targetExtendTag = `<extend from="./${baseFile}" html />`;
    const targetMarkup = '<marquee>daaaamn</marquee>';
    const targetContents = [targetExtendTag, targetMarkup].join('\n');
    fs.access.mockRejectedValueOnce(new Error('File not found'));
    let sut = null;
    sut = new SFCParser();
    await expect(() => sut.parse(targetContents, targetFile)).rejects.toThrow(
      /unable to load/i,
    );
  });

  it('should fail to parse a file that has multiple tags on the same line', async () => {
    const baseFile = 'base.svelte';
    const baseModuleScript = 'alert(window)';
    const baseScript = 'console.log(window);';
    const baseStyle = 'a { color: red; }';
    const baseMarkup = '<markquee>woooo</marquee>';
    const problemLine = `<script context="module">${baseModuleScript}</script>`;
    const baseContents = [
      problemLine,
      '<script>',
      baseScript,
      '</script>',
      '<style extend="true">',
      baseStyle,
      '</style>',
      baseMarkup,
    ].join('\n');
    const targetFile = 'target.svelte';
    const targetExtendTag = `<extend from="./${baseFile}" html />`;
    const targetMarkup = ['<marquee>daaaamn</marquee>', '<img src="image.png" />'].join(
      '\n',
    );
    const targetContents = [targetExtendTag, targetMarkup].join('\n');
    const newData = {
      addBaseFileData: jest.fn(),
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const sfcDataConstructor = jest.fn(() => newData);
    class SFCData {
      static new(...args) {
        return sfcDataConstructor(...args);
      }
    }
    fs.access.mockResolvedValueOnce();
    fs.readFile.mockImplementationOnce(() => Promise.resolve(baseContents));
    let sut = null;
    sut = new SFCParser(SFCData);
    await expect(() => sut.parse(targetContents, targetFile)).rejects.toThrow(
      [
        'The parser cant handle multiple script/style tags on the same line (sorry!)',
        `- file: ${baseFile}`,
        '- line: 1',
        `- code: ${problemLine}`,
      ].join('\n'),
    );
  });

  it('should parse a file', async () => {
    const baseFile = 'base.svelte';
    const baseModuleScript = 'alert(window)';
    const baseScript = 'console.log(window);';
    const baseStyle = 'a { color: red; }';
    const baseMarkup = '<markquee>woooo</marquee>';
    const baseContents = [
      '<script context="module">',
      baseModuleScript,
      '</script>',
      '<script>',
      baseScript,
      '</script>',
      '<style extend="true">',
      baseStyle,
      `</style>${baseMarkup}`,
    ].join('\n');
    const targetFile = 'target.svelte';
    const targetExtendTag = `<extend from="./${baseFile}" html />`;
    const targetMarkup = ['<marquee>daaaamn</marquee>', '<img src="image.png" />'].join(
      '\n',
    );
    const targetContents = [targetExtendTag, targetMarkup].join('\n');
    const newData = {
      addBaseFileData: jest.fn(),
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const sfcDataConstructor = jest.fn(() => newData);
    class SFCData {
      static new(...args) {
        return sfcDataConstructor(...args);
      }
    }
    fs.access.mockResolvedValueOnce();
    fs.readFile.mockImplementationOnce(() => Promise.resolve(baseContents));
    let sut = null;
    sut = new SFCParser(SFCData);
    const result = await sut.parse(targetContents, targetFile);
    expect(result).toBe(newData);
    expect(fs.access).toHaveBeenCalledTimes(1);
    expect(fs.access).toHaveBeenCalledWith(baseFile);
    expect(fs.readFile).toHaveBeenCalledTimes(1);
    expect(fs.readFile).toHaveBeenCalledWith(baseFile, 'utf-8');
    expect(sfcDataConstructor).toHaveBeenCalledTimes(2);
    expect(sfcDataConstructor).toHaveBeenCalledWith(baseFile);
    expect(sfcDataConstructor).toHaveBeenCalledWith(targetFile);
    expect(newData.addBaseFileData).toHaveBeenCalledTimes(1);
    expect(newData.addBaseFileData).toHaveBeenCalledWith(newData, {
      from: `./${baseFile}`,
      html: true,
    });
    expect(newData.addMarkup).toHaveBeenCalledTimes(2);
    expect(newData.addMarkup).toHaveBeenCalledWith(baseMarkup);
    expect(newData.addMarkup).toHaveBeenCalledWith(targetMarkup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(baseModuleScript, {
      context: 'module',
    });
    expect(newData.addScript).toHaveBeenCalledWith(baseScript, {});
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(baseStyle, {
      extend: true,
    });
  });

  it('should parse a file with text lines on the markup', async () => {
    const baseFile = 'base.svelte';
    const baseModuleScript = 'alert(window)';
    const baseScript = 'console.log(window);';
    const baseStyle = 'a { color: red; }';
    const baseMarkup = [
      '<markquee>',
      'woooo',
      '<span>',
      '...',
      '</span>',
      '</marquee>',
      'something',
    ].join('\n');
    const baseContents = [
      '<script context="module">',
      baseModuleScript,
      '</script>',
      '<script>',
      baseScript,
      '</script>',
      '<style extend="true">',
      baseStyle,
      `</style>${baseMarkup}`,
    ].join('\n');
    const targetFile = 'target.svelte';
    const targetExtendTag = `<extend from="./${baseFile}" html />`;
    const targetMarkup = ['<marquee>daaaamn</marquee>', '<img src="image.png" />'].join(
      '\n',
    );
    const targetContents = [targetExtendTag, targetMarkup].join('\n');
    const newData = {
      addBaseFileData: jest.fn(),
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const sfcDataConstructor = jest.fn(() => newData);
    class SFCData {
      static new(...args) {
        return sfcDataConstructor(...args);
      }
    }
    fs.access.mockResolvedValueOnce();
    fs.readFile.mockImplementationOnce(() => Promise.resolve(baseContents));
    let sut = null;
    sut = new SFCParser(SFCData);
    const result = await sut.parse(targetContents, targetFile);
    expect(result).toBe(newData);
    expect(fs.access).toHaveBeenCalledTimes(1);
    expect(fs.access).toHaveBeenCalledWith(baseFile);
    expect(fs.readFile).toHaveBeenCalledTimes(1);
    expect(fs.readFile).toHaveBeenCalledWith(baseFile, 'utf-8');
    expect(sfcDataConstructor).toHaveBeenCalledTimes(2);
    expect(sfcDataConstructor).toHaveBeenCalledWith(baseFile);
    expect(sfcDataConstructor).toHaveBeenCalledWith(targetFile);
    expect(newData.addBaseFileData).toHaveBeenCalledTimes(1);
    expect(newData.addBaseFileData).toHaveBeenCalledWith(newData, {
      from: `./${baseFile}`,
      html: true,
    });
    expect(newData.addMarkup).toHaveBeenCalledTimes(2);
    expect(newData.addMarkup).toHaveBeenCalledWith(baseMarkup);
    expect(newData.addMarkup).toHaveBeenCalledWith(targetMarkup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(baseModuleScript, {
      context: 'module',
    });
    expect(newData.addScript).toHaveBeenCalledWith(baseScript, {});
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(baseStyle, {
      extend: true,
    });
  });

  it('should parse a file with nested tags', async () => {
    const baseFile = 'base.svelte';
    const baseModuleScript = 'alert(window)';
    const baseScript = [
      '<script>',
      'console.log(`',
      '<script>',
      "console.log('inception')",
      '</script>',
      '<style>',
      'a { color: blue; };',
      '</style>',
      '`);',
      '</script>',
    ].join('\n');
    const baseStyle = 'a { color: red; }';
    const baseMarkup = '<markquee>woooo</marquee>';
    const baseContents = [
      '<script context="module">',
      baseModuleScript,
      '</script>',
      '<script>',
      baseScript,
      '</script>',
      '<style extend="true">',
      baseStyle,
      `</style>${baseMarkup}`,
    ].join('\n');
    const targetFile = 'target.svelte';
    const targetExtendTag = `<extend from="./${baseFile}" html />`;
    const targetMarkup = ['<marquee>daaaamn</marquee>', '<img src="image.png" />'].join(
      '\n',
    );
    const targetContents = [targetExtendTag, targetMarkup].join('\n');
    const newData = {
      addBaseFileData: jest.fn(),
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const sfcDataConstructor = jest.fn(() => newData);
    class SFCData {
      static new(...args) {
        return sfcDataConstructor(...args);
      }
    }
    fs.access.mockResolvedValueOnce();
    fs.readFile.mockResolvedValueOnce(baseContents);
    let sut = null;
    sut = new SFCParser(SFCData);
    const result = await sut.parse(targetContents, targetFile);
    expect(result).toBe(newData);
    expect(fs.access).toHaveBeenCalledTimes(1);
    expect(fs.access).toHaveBeenCalledWith(baseFile);
    expect(fs.readFile).toHaveBeenCalledTimes(1);
    expect(fs.readFile).toHaveBeenCalledWith(baseFile, 'utf-8');
    expect(sfcDataConstructor).toHaveBeenCalledTimes(2);
    expect(sfcDataConstructor).toHaveBeenCalledWith(baseFile);
    expect(sfcDataConstructor).toHaveBeenCalledWith(targetFile);
    expect(newData.addBaseFileData).toHaveBeenCalledTimes(1);
    expect(newData.addBaseFileData).toHaveBeenCalledWith(newData, {
      from: `./${baseFile}`,
      html: true,
    });
    expect(newData.addMarkup).toHaveBeenCalledTimes(2);
    expect(newData.addMarkup).toHaveBeenCalledWith(baseMarkup);
    expect(newData.addMarkup).toHaveBeenCalledWith(targetMarkup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(baseModuleScript, {
      context: 'module',
    });
    expect(newData.addScript).toHaveBeenCalledWith(baseScript, {});
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(baseStyle, {
      extend: true,
    });
  });

  it('should parse a file that extends an already extended file', async () => {
    const baseFile = 'base.svelte';
    const baseModuleScript = 'alert(window)';
    const baseScript = "console.log('Batman');";
    const baseStyle = 'a { color: red; }';
    const baseMarkup = '<markquee>woooo</marquee>';
    const baseContents = [
      '<script context="module">',
      baseModuleScript,
      '</script>',
      '<script>',
      baseScript,
      '</script>',
      '<style extend="true">',
      baseStyle,
      '</style>',
      baseMarkup,
    ].join('\n');
    const subFile = 'sub.svelte';
    const subExtendTag = `<extend from="./${baseFile}" html />`;
    const subMarkup = '<marquee>daaaamn it</marquee>';
    const subContents = [subExtendTag, subMarkup].join('\n');
    const targetFile = 'target.svelte';
    const targetExtendTag = `<extend from="./${subFile}" />`;
    const targetMarkup = '<marquee>daaaamn</marquee>';
    const targetContents = [targetExtendTag, targetMarkup].join('\n');
    const newData = {
      addBaseFileData: jest.fn(),
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const sfcDataConstructor = jest.fn();
    class SFCData {
      static new(...args) {
        sfcDataConstructor(...args);
        return new SFCData(...args);
      }

      constructor() {
        Object.keys(newData).forEach((mock) => {
          this[mock] = newData[mock];
        });
      }
    }
    fs.access.mockResolvedValueOnce();
    fs.access.mockResolvedValueOnce();
    fs.readFile.mockResolvedValueOnce(subContents);
    fs.readFile.mockResolvedValueOnce(baseContents);
    let sut = null;
    sut = new SFCParser(SFCData);
    const result = await sut.parse(targetContents, targetFile);
    expect(result).toBeInstanceOf(SFCData);
    expect(fs.access).toHaveBeenCalledTimes(2);
    expect(fs.access).toHaveBeenCalledWith(baseFile);
    expect(fs.access).toHaveBeenCalledWith(subFile);
    expect(fs.readFile).toHaveBeenCalledTimes(2);
    expect(fs.readFile).toHaveBeenCalledWith(baseFile, 'utf-8');
    expect(fs.readFile).toHaveBeenCalledWith(subFile, 'utf-8');
    expect(sfcDataConstructor).toHaveBeenCalledTimes(3);
    expect(sfcDataConstructor).toHaveBeenCalledWith(baseFile);
    expect(sfcDataConstructor).toHaveBeenCalledWith(subFile);
    expect(sfcDataConstructor).toHaveBeenCalledWith(targetFile);
    expect(newData.addBaseFileData).toHaveBeenCalledTimes(2);
    expect(newData.addBaseFileData).toHaveBeenCalledWith(newData, {
      from: `./${baseFile}`,
      html: true,
    });
    expect(newData.addBaseFileData).toHaveBeenCalledWith(newData, {
      from: `./${subFile}`,
    });
    expect(newData.addMarkup).toHaveBeenCalledTimes(3);
    expect(newData.addMarkup).toHaveBeenCalledWith(baseMarkup);
    expect(newData.addMarkup).toHaveBeenCalledWith(subMarkup);
    expect(newData.addMarkup).toHaveBeenCalledWith(targetMarkup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(baseModuleScript, {
      context: 'module',
    });
    expect(newData.addScript).toHaveBeenCalledWith(baseScript, {});
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(baseStyle, {
      extend: true,
    });
  });

  it('should fail to parse when trying to extend below the allowed depth', async () => {
    const baseFile = 'base.svelte';
    const subFile = 'sub.svelte';
    const subExtendTag = `<extend from="./${baseFile}" html />`;
    const subMarkup = '<marquee>daaaamn it</marquee>';
    const subContents = [subExtendTag, subMarkup].join('\n');
    const targetFile = 'target.svelte';
    const targetExtendTag = `<extend from="./${subFile}" />`;
    const targetMarkup = '<marquee>daaaamn</marquee>';
    const targetContents = [targetExtendTag, targetMarkup].join('\n');
    const newData = {
      addBaseFileData: jest.fn(),
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const sfcDataConstructor = jest.fn();
    class SFCData {
      static new(...args) {
        sfcDataConstructor(...args);
        return new SFCData(...args);
      }

      constructor() {
        Object.keys(newData).forEach((mock) => {
          this[mock] = newData[mock];
        });
      }
    }
    fs.access.mockResolvedValueOnce();
    fs.access.mockResolvedValueOnce();
    fs.readFile.mockResolvedValueOnce(subContents);
    const maxDepth = 1;
    let sut = null;
    sut = new SFCParser(SFCData);
    await expect(() => sut.parse(targetContents, targetFile, maxDepth)).rejects.toThrow(
      /can't extend from another file/i,
    );
  });

  it('should fail to parse when trying to extend below the allowed depth (filepath)', async () => {
    const baseFile = 'base.svelte';
    const subFile = 'sub.svelte';
    const subExtendTag = `<extend from="./${baseFile}" html />`;
    const subMarkup = '<marquee>daaaamn it</marquee>';
    const subContents = [subExtendTag, subMarkup].join('\n');
    const targetFile = 'target.svelte';
    const targetExtendTag = `<extend from="./${subFile}" />`;
    const targetMarkup = '<marquee>daaaamn</marquee>';
    const targetContents = [targetExtendTag, targetMarkup].join('\n');
    const newData = {
      addBaseFileData: jest.fn(),
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const sfcDataConstructor = jest.fn();
    class SFCData {
      static new(...args) {
        sfcDataConstructor(...args);
        return new SFCData(...args);
      }

      constructor() {
        Object.keys(newData).forEach((mock) => {
          this[mock] = newData[mock];
        });
      }
    }
    fs.access.mockResolvedValueOnce();
    fs.access.mockResolvedValueOnce();
    fs.readFile.mockResolvedValueOnce(targetContents);
    fs.readFile.mockResolvedValueOnce(subContents);
    const maxDepth = 1;
    let sut = null;
    sut = new SFCParser(SFCData);
    await expect(() => sut.parseFromPath(targetFile, maxDepth)).rejects.toThrow(
      /can't extend from another file/i,
    );
  });

  it('should parse a file from its path', async () => {
    const baseFile = 'base.svelte';
    const baseModuleScript = 'alert(window)';
    const baseScript = 'console.log(window);';
    const baseStyle = 'a { color: red; }';
    const baseMarkup = '<markquee>woooo</marquee>';
    const baseContents = [
      '<script context="module">',
      baseModuleScript,
      '</script>',
      '<script>',
      baseScript,
      '</script>',
      '<style extend="true">',
      baseStyle,
      '</style>',
      baseMarkup,
    ].join('\n');
    const targetFile = 'target.svelte';
    const targetExtendTag = `<extend from="./${baseFile}" html />`;
    const targetMarkup = ['<marquee>daaaamn</marquee>', '<img src="image.png" />'].join(
      '\n',
    );
    const targetContents = [targetExtendTag, targetMarkup].join('\n');
    const newData = {
      addBaseFileData: jest.fn(),
      addMarkup: jest.fn(),
      addScript: jest.fn(),
      addStyle: jest.fn(),
    };
    const sfcDataConstructor = jest.fn(() => newData);
    class SFCData {
      static new(...args) {
        return sfcDataConstructor(...args);
      }
    }
    fs.access.mockResolvedValueOnce();
    fs.readFile.mockResolvedValueOnce(targetContents);
    fs.readFile.mockResolvedValueOnce(baseContents);
    let sut = null;
    sut = new SFCParser(SFCData);
    const result = await sut.parseFromPath(targetFile);
    expect(result).toBe(newData);
    expect(fs.access).toHaveBeenCalledTimes(1);
    expect(fs.access).toHaveBeenCalledWith(baseFile);
    expect(fs.readFile).toHaveBeenCalledTimes(2);
    expect(fs.readFile).toHaveBeenCalledWith(targetFile, 'utf-8');
    expect(fs.readFile).toHaveBeenCalledWith(baseFile, 'utf-8');
    expect(sfcDataConstructor).toHaveBeenCalledTimes(2);
    expect(sfcDataConstructor).toHaveBeenCalledWith(baseFile);
    expect(sfcDataConstructor).toHaveBeenCalledWith(targetFile);
    expect(newData.addBaseFileData).toHaveBeenCalledTimes(1);
    expect(newData.addBaseFileData).toHaveBeenCalledWith(newData, {
      from: `./${baseFile}`,
      html: true,
    });
    expect(newData.addMarkup).toHaveBeenCalledTimes(2);
    expect(newData.addMarkup).toHaveBeenCalledWith(baseMarkup);
    expect(newData.addMarkup).toHaveBeenCalledWith(targetMarkup);
    expect(newData.addScript).toHaveBeenCalledTimes(2);
    expect(newData.addScript).toHaveBeenCalledWith(baseModuleScript, {
      context: 'module',
    });
    expect(newData.addScript).toHaveBeenCalledWith(baseScript, {});
    expect(newData.addStyle).toHaveBeenCalledTimes(1);
    expect(newData.addStyle).toHaveBeenCalledWith(baseStyle, {
      extend: true,
    });
  });

  it('should have a provider for the DI container', () => {
    // Given
    const app = {
      set: jest.fn(),
      get: jest.fn((service) => service),
    };
    let sut = null;
    let serviceFn = null;
    const expectedGets = ['sfcData'];
    // When
    sfcParser(app);
    [[, serviceFn]] = app.set.mock.calls;
    sut = serviceFn();
    // Then
    expect(sut).toBeInstanceOf(SFCParser);
    expect(app.get).toHaveBeenCalledTimes(expectedGets.length);
    expectedGets.forEach((service) => {
      expect(app.get).toHaveBeenCalledWith(service);
    });
    expect(app.set).toHaveBeenCalledTimes(1);
    expect(app.set).toHaveBeenCalledWith('sfcParser', expect.any(Function));
  });
});
