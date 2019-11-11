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
  }

  addBaseFileData(fileData) {
    if (!(fileData instanceof SFCData)) {
      throw new Error('`fileData` must be an instance of SFCData');
    }

    this._baseFile = fileData;
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

  get hasStyles() {
    return this._styles.length > 0;
  }

  get styles() {
    return this._styles;
  }

  get hasScripts() {
    return this._scripts.length > 0;
  }

  get scripts() {
    return this._scripts;
  }

  get hasModuleScripts() {
    return this._moduleScripts.length > 0;
  }

  get moduleScripts() {
    return this._moduleScripts;
  }
}

const sfcData = provider((app) => {
  app.set('sfcData', () => SFCData);
});

module.exports = {
  SFCData,
  sfcData,
};
