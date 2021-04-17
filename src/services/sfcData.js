const path = require('path');
const { provider } = require('jimple');
/**
 * A basic class to handle single file components' (SFC) data and rendering for the app.
 */
class SFCData {
  /**
   * A shorthand to create a new instance of the class.
   *
   * @param {string} filepath  The file path of the component for which the data will be
   *                           saved. This is later used when merging components in order
   *                           to fix relative paths between files.
   * @returns {SFCData}
   * @static
   */
  static new(filepath) {
    return new SFCData(filepath);
  }
  /**
   * @param {string} filepath  The file path of the component for which the data will be
   *                           saved. This is later used when merging components in order
   *                           to fix relative paths between files.
   */
  constructor(filepath) {
    /**
     * The path of the SFC.
     *
     * @type {string}
     * @access protected
     * @ignore
     */
    this._filepath = filepath;
    /**
     * The directory where the SFC is located.
     *
     * @type {string}
     * @access protected
     * @ignore
     */
    this._directory = path.dirname(this._filepath);
    /**
     * The HTML markup of the SFC; this doesn't include scripts and styles.
     *
     * @type {string}
     * @access protected
     * @ignore
     */
    this._markup = '';
    /**
     * The list of script tags the SFC has.
     *
     * @type {SFCTag[]}
     * @access protected
     * @ignore
     */
    this._scripts = [];
    /**
     * The list of module script tags (those with the `context="module"` attribute) the
     * SFC has.
     *
     * @type {SFCTag[]}
     * @access protected
     * @ignore
     */
    this._moduleScripts = [];
    /**
     * The list of style tags the SFC has.
     *
     * @type {SFCTag[]}
     * @access protected
     * @ignore
     */
    this._styles = [];
    /**
     * In case the SFC extends another SFC, this will be a reference for it.
     *
     * @type {?SFCData}
     * @access protected
     * @ignore
     */
    this._baseFile = null;
    /**
     * In case the SFC extends another SFC, this dictionary will contain the information
     * of the `<extend />` tag.
     *
     * @type {Object}
     * @access protected
     * @ignore
     */
    this._extendTagAttributes = {};
  }
  /**
   * Adds the information of a SFC this one is extending.
   *
   * @param {SFCData} fileData             The SFC information.
   * @param {Object}  extendTagAttributes  The attributes of this SFC `<extend />` tag.
   * @throws {Error} If this SFC already has a base SFC already set.
   * @throws {Error} If the `fileData` is not an instance of {@link SFCData}.
   */
  addBaseFileData(fileData, extendTagAttributes = {}) {
    if (this._baseFile) {
      throw new Error("You can't add more than one base file data");
    } else if (!(fileData instanceof SFCData)) {
      throw new Error('`fileData` must be an instance of SFCData');
    }

    this._baseFile = fileData;
    this._extendTagAttributes = extendTagAttributes;
  }
  /**
   * Adds HTML markup for the SFC. If there's already markup saved, it will just append
   * it.
   *
   * @param {string} content  The HTML code to add.
   */
  addMarkup(content) {
    const newMarkup = this._markup ? `${this._markup}\n${content}` : content;
    this._markup = newMarkup;
  }
  /**
   * Adds a script tag information to the SFC.
   *
   * @param {string} content     The contents of the tag.
   * @param {Object} attributes  A dictionary with the tag attributes.
   */
  addScript(content, attributes = {}) {
    const list = attributes.context === 'module' ? this._moduleScripts : this._scripts;
    list.push({
      content,
      attributes,
    });
  }
  /**
   * Adds a style tag information to the SFC.
   *
   * @param {string} content     The contents of the tag.
   * @param {Object} attributes  A dictionary with the tag attributes.
   */
  addStyle(content, attributes = {}) {
    this._styles.push({
      content,
      attributes,
    });
  }
  /**
   * Renders the whole SFC information into a string, so it can be saved on a file.
   *
   * @returns {string}
   */
  render() {
    const lines = [];
    if (this.hasModuleScripts) {
      lines.push(this._renderTag('script', this.moduleScript));
    }

    if (this.hasScripts) {
      lines.push(this._renderTag('script', this.script));
    }

    if (this.hasStyles) {
      lines.push(this._renderTag('style', this.style));
    }

    lines.push(this.markup);
    return lines.join('\n');
  }
  /**
   * The path of the SFC.
   *
   * @type {string}
   */
  get filepath() {
    return this._filepath;
  }
  /**
   * The directory where the SFC is located.
   *
   * @type {string}
   */
  get directory() {
    return this._directory;
  }
  /**
   * Whether or not the SFC extends another SFC.
   *
   * @type {boolean}
   */
  get hasBaseFileData() {
    return this._baseFile !== null;
  }
  /**
   * In case the SFC extends another SFC, this will be a reference for it.
   *
   * @type {?SFCData}
   */
  get baseFileData() {
    return this._baseFile;
  }
  /**
   * In case the SFC extends another SFC, this dictionary will contain the information of
   * the `<extend />` tag.
   *
   * @type {Object}
   */
  get extendTagAttributes() {
    return this._extendTagAttributes;
  }
  /**
   * The HTML markup of the SFC; this doesn't include scripts and styles.
   *
   * @type {string}
   */
  get markup() {
    return this._markup;
  }
  /**
   * Whether or not the SFC has style tags.
   *
   * @type {boolean}
   */
  get hasStyles() {
    return this._styles.length > 0;
  }
  /**
   * The list of style tags the SFC has.
   *
   * @type {SFCTag[]}
   */
  get styles() {
    return this._styles;
  }
  /**
   * A single {@link SFCTag} that merges the contents and attributes of all the style tags
   * the SFC has.
   *
   * @type {SFCTag}
   */
  get style() {
    return this._mergeTags(this._styles);
  }
  /**
   * Whether or not the SFC has script tags.
   *
   * @type {boolean}
   */
  get hasScripts() {
    return this._scripts.length > 0;
  }
  /**
   * The list of script tags the SFC has.
   *
   * @type {SFCTag[]}
   */
  get scripts() {
    return this._scripts;
  }
  /**
   * A single {@link SFCTag} that merges the contents and attributes of all the script
   * tags the SFC has.
   *
   * @type {SFCTag}
   */
  get script() {
    return this._mergeTags(this._scripts);
  }
  /**
   * Whether or not the SFC has module script tags (those with the `context="module"`
   * attribute).
   *
   * @type {boolean}
   */
  get hasModuleScripts() {
    return this._moduleScripts.length > 0;
  }
  /**
   * The list of module script tags (those with the `context="module"` attribute) the SFC
   * has.
   *
   * @type {SFCTag[]}
   */
  get moduleScripts() {
    return this._moduleScripts;
  }
  /**
   * A single {@link SFCTag} that merges the contents and attributes of all the module
   * scripts tags (those with the `context="module"` attribute) the SFC has.
   *
   * @type {SFCTag}
   */
  get moduleScript() {
    const result = this._mergeTags(this._moduleScripts);
    result.attributes.context = 'module';
    return result;
  }
  /**
   * A utility method that merges a list of tags into a single one.
   *
   * @param {SFCTag[]} tags  The list of tags to merge.
   * @returns {SFCTag}
   * @access protected
   * @ignore
   */
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
          attributes: Object.assign({}, acc.attributes, tag.attributes),
        }),
        {
          content: '',
          attributes: {},
        },
      );

      result.content = result.content.replace(/^\n/, '');
    }

    return result;
  }
  /**
   * Renders a {@link SFCTag} on a string.
   *
   * @param {string} name  The name of the tag (like `script` or `style`).
   * @param {SFCTag} tag   The tag information.
   * @returns {string}
   * @access protected
   * @ignore
   */
  _renderTag(name, tag) {
    const attrsNames = Object.keys(tag.attributes);
    let attrs;
    if (attrsNames.length) {
      attrs = attrsNames
        .reduce((acc, attrName) => {
          const value = tag.attributes[attrName];
          return [...acc, `${attrName}="${value}"`];
        }, [])
        .join(' ');
      attrs = ` ${attrs}`;
    } else {
      attrs = '';
    }

    return [`<${name}${attrs}>`, tag.content, `</${name}>`].join('\n');
  }
}
/**
 * The service provider that once registered on {@link SvelteExtend} will save the class
 * {@link SFCData} as the `sfcData` service.
 *
 * @type {Provider}
 */
const sfcData = provider((app) => {
  app.set('sfcData', () => SFCData);
});

module.exports = {
  SFCData,
  sfcData,
};
