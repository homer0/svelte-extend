const path = require('path');
const { provider } = require('jimple');

class SFCData {
  static new(filepath) {
    return new SFCData(filepath);
  }

  constructor(filepath) {
    this._filepath = filepath;
    this._directory = path.dirname(this._filepath);
    this._markup = '';
    this._scripts = [];
    this._moduleScripts = [];
    this._styles = [];
    this._baseFile = null;
    this._extendTagAttributes = {};
  }

  addBaseFileData(fileData, extendTagAttributes = {}) {
    if (this._baseFile) {
      throw new Error('You can\'t add more than one base file data');
    } else if (!(fileData instanceof SFCData)) {
      throw new Error('`fileData` must be an instance of SFCData');
    }

    this._baseFile = fileData;
    this._extendTagAttributes = extendTagAttributes;
  }

  addMarkup(content) {
    const newMarkup = this._markup ?
      `${this._markup}\n${content}` :
      content;
    this._markup = newMarkup;
  }

  addScript(content, attributes = {}) {
    const list = attributes.context === 'module' ?
      this._moduleScripts :
      this._scripts;
    list.push({
      content,
      attributes,
    });
  }

  addStyle(content, attributes = {}) {
    this._styles.push({
      content,
      attributes,
    });
  }

  get filepath() {
    return this._filepath;
  }

  get directory() {
    return this._directory;
  }

  get hasBaseFileData() {
    return this._baseFile !== null;
  }

  get baseFileData() {
    return this._baseFile;
  }

  get extendTagAttributes() {
    return this._extendTagAttributes;
  }

  get markup() {
    return this._markup;
  }

  get hasStyles() {
    return this._styles.length > 0;
  }

  get styles() {
    return this._styles;
  }

  get style() {
    return this._mergeTags(this._styles);
  }

  get hasScripts() {
    return this._scripts.length > 0;
  }

  get scripts() {
    return this._scripts;
  }

  get script() {
    return this._mergeTags(this._scripts);
  }

  get hasModuleScripts() {
    return this._moduleScripts.length > 0;
  }

  get moduleScripts() {
    return this._moduleScripts;
  }

  get moduleScript() {
    return this._mergeTags(this._moduleScripts);
  }

  _mergeTags(tags) {
    let result;
    if (tags.length === 0) {
      result = {
        content: '',
        attributes: {},
      };
    } else if (tags.length === 1) {
      [result] = tags;
    } else {
      result = tags.reduce(
        (acc, tag) => ({
          content: `${acc.content}\n${tag.content}`,
          attributes: Object.assign(
            {},
            acc.attributes,
            tag.attributes
          ),
        }),
        {
          content: '',
          attributes: {},
        }
      );

      result.content = result.content.replace(/^\n/, '');
    }

    return result;
  }
}

const sfcData = provider((app) => {
  app.set('sfcData', () => SFCData);
});

module.exports = {
  SFCData,
  sfcData,
};
