const JimpleMock = require('/tests/mocks/jimple.mock');

jest.mock('fs-extra');
jest.mock('jimple', () => JimpleMock);
jest.unmock('/src/services/sfcParser');

require('jasmine-expect');
const fs = require('fs-extra');
const { SFCParser, sfcParser } = require('/src/services/sfcParser');

describe('SFCParser', () => {
  beforeEach(() => {
    fs.pathExists.mockReset();
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

  it("should fail to parse a file if the base file doesn't exist", () => {
    const baseFile = 'base.svelte';
    const targetFile = 'target.svelte';
    const targetExtendTag = `<extend from="./${baseFile}" html />`;
    const targetMarkup = '<marquee>daaaamn</marquee>';
    const targetContents = [targetExtendTag, targetMarkup].join('\n');
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(false));
    let sut = null;
    sut = new SFCParser();
    return sut
      .parse(targetContents, targetFile)
      .then(() => {
        expect(true).toBeFalse();
      })
      .catch((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(/unable to load/i);
      });
  });

  it('should fail to parse a file that has multiple tags on the same line', () => {
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
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(baseContents));
    let sut = null;
    sut = new SFCParser(SFCData);
    return sut
      .parse(targetContents, targetFile)
      .then(() => {
        expect(true).toBeFalse();
      })
      .catch((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(
          [
            'The parser cant handle multiple script/style tags on the same line (sorry!)',
            `- file: ${baseFile}`,
            '- line: 1',
            `- code: ${problemLine}`,
          ].join('\n'),
        );
      });
  });

  it('should parse a file', () => {
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
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(baseContents));
    let sut = null;
    sut = new SFCParser(SFCData);
    return sut.parse(targetContents, targetFile).then((result) => {
      expect(result).toBe(newData);
      expect(fs.pathExists).toHaveBeenCalledTimes(1);
      expect(fs.pathExists).toHaveBeenCalledWith(baseFile);
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
  });

  it('should parse a file with text lines on the markup', () => {
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
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(baseContents));
    let sut = null;
    sut = new SFCParser(SFCData);
    return sut.parse(targetContents, targetFile).then((result) => {
      expect(result).toBe(newData);
      expect(fs.pathExists).toHaveBeenCalledTimes(1);
      expect(fs.pathExists).toHaveBeenCalledWith(baseFile);
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
  });

  it('should parse a file with nested tags', () => {
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
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(baseContents));
    let sut = null;
    sut = new SFCParser(SFCData);
    return sut.parse(targetContents, targetFile).then((result) => {
      expect(result).toBe(newData);
      expect(fs.pathExists).toHaveBeenCalledTimes(1);
      expect(fs.pathExists).toHaveBeenCalledWith(baseFile);
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
  });

  it('should parse a file that extends an already extended file', () => {
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
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(subContents));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(baseContents));
    let sut = null;
    sut = new SFCParser(SFCData);
    return sut.parse(targetContents, targetFile).then((result) => {
      expect(result).toBeInstanceOf(SFCData);
      expect(fs.pathExists).toHaveBeenCalledTimes(2);
      expect(fs.pathExists).toHaveBeenCalledWith(baseFile);
      expect(fs.pathExists).toHaveBeenCalledWith(subFile);
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
  });

  it('should fail to parse when trying to extend below the allowed depth', () => {
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
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(subContents));
    const maxDepth = 1;
    let sut = null;
    sut = new SFCParser(SFCData);
    return sut
      .parse(targetContents, targetFile, maxDepth)
      .then(() => {
        expect(true).toBeFalse();
      })
      .catch((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(/can't extend from another file/i);
      });
  });

  it('should fail to parse when trying to extend below the allowed depth (filepath)', () => {
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
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(targetContents));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(subContents));
    const maxDepth = 1;
    let sut = null;
    sut = new SFCParser(SFCData);
    return sut
      .parseFromPath(targetFile, maxDepth)
      .then(() => {
        expect(true).toBeFalse();
      })
      .catch((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(/can't extend from another file/i);
      });
  });

  it('should parse a file from its path', () => {
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
    fs.pathExists.mockImplementationOnce(() => Promise.resolve(true));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(targetContents));
    fs.readFile.mockImplementationOnce(() => Promise.resolve(baseContents));
    let sut = null;
    sut = new SFCParser(SFCData);
    return sut.parseFromPath(targetFile).then((result) => {
      expect(result).toBe(newData);
      expect(fs.pathExists).toHaveBeenCalledTimes(1);
      expect(fs.pathExists).toHaveBeenCalledWith(baseFile);
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
