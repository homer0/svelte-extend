const path = require('path');
const { provider } = require('@homer0/jimple');
/**
 * This is the class that merges single file components (SFCs).
 */
class Extender {
  /**
   * @param {JSMerger}       jsMerger  To merge the JS scripts and remove duplicated
   *                                   declarations.
   * @param {Class<SFCData>} sfcData   To create a "final" SFC with the merged
   *                                   information.
   */
  constructor(jsMerger, sfcData) {
    /**
     * A local reference for the `jsMerger` service.
     *
     * @type {JSMerger}
     * @access protected
     * @ignore
     */
    this._jsMerger = jsMerger;
    /**
     * The class used to create the objects with the SFC merged information.
     *
     * @type {Class<SFCData>}
     * @access protected
     * @ignore
     */
    this._sfcData = sfcData;
    /**
     * A dictionary of regular expression the class uses.
     *
     * @type {Object}
     * @property {RegExp} htmlSrc  A expression the class will use to find `src`
     *                             attributes on HTML code in order to update relative
     *                             paths when merging two SFCs.
     * @property {RegExp} cssUrl   A expression the class will use to find `url()`
     *                             properties on CSS code in order to update relative
     *                             paths when merging two SFCs.
     * @property {RegExp} jsPaths  A expression the class will use to find `import`
     *                             statements on JS code in order to update relative paths
     *                             when merging two SFCs.
     * @access protected
     * @ignore
     */
    this._expressions = {
      htmlSrc: /\s+(?:src="(\.[^"]+)"|src='(\.[^']+)')/gi,
      cssUrl: /url\s*\(\s*(?:['"])?(\.[^"']+)(?:['"])?\)/gi,
      jsPaths:
        /(?: |^)(?:(?:from|import)\s+(?:["'](\.[^"']+)["'])|require\s*\(\s*["'](\.[^"']+)["']\s*\))/gim,
    };
    /**
     * A list of private attributes used by the application and that should be removed
     * from tags.
     *
     * @type {string[]}
     * @access protected
     * @ignore
     */
    this._privateAttributes = ['extend'];
  }
  /**
   * Takes an SFC data object, check if it extends from another and then does a recursive
   * merge in order to generate a final SFC data object. It's recursive in case an SFC
   * extends from an SFC that then extends from another...
   *
   * @param {SFCData} sfc           The SFC information.
   * @param {number}  [maxDepth=0]  How many components can be extended. For example, if a
   *                                file extends from one that extends from another and
   *                                the parameter is set to `1`, the parsing will fail.
   * @returns {SFCData}
   * @throws {Error} If the "extend chain" goes beyond the `maxDepth` limit.
   */
  generate(sfc, maxDepth = 0) {
    return this._generate(sfc, maxDepth, 1);
  }
  /**
   * Removes the {@link Extender#_privateAttributes} from a dictionary of attributes.
   *
   * @param {Object} attributes  The dictionary of attributes to clean.
   * @returns {Object} A new dictionary without the private attributes.
   * @access protected
   * @ignore
   */
  _cleanAttributes(attributes) {
    const result = { ...attributes };
    this._privateAttributes.forEach((name) => {
      delete result[name];
    });

    return result;
  }
  /**
   * Utility method to remove empty lines from the beginning and end of a block of code.
   * This method exists because is common for a block to end up like this when merging its
   * contents.
   *
   * @param {string} text  The text to clean.
   * @returns {string}
   * @access protected
   * @ignore
   */
  _cleanTextBlock(text) {
    const newText = text.replace(/^\n/, '').replace(/\n$/, '');

    return newText.trim() ? newText : '';
  }
  /**
   * Generates a single SFC data object by merging a base SFC and one that extends it.
   *
   * @param {SFCData} base    The data of the base SFC.
   * @param {SFCData} target  The data of the SFC that extends the base.
   * @returns {SFCData}
   * @access protected
   * @ignore
   */
  _extend(base, target) {
    const relative = path.relative(target.directory, base.directory);
    const absolute = path.join(target.directory, relative);
    const directory = path.relative(target.directory, absolute);

    const sfc = this._sfcData.new(target.filepath);
    sfc.addMarkup(this._extendMarkup(base, target, directory));
    const moduleScript = this._extendModuleScript(base, target, directory);
    if (moduleScript.content) {
      sfc.addScript(moduleScript.content, moduleScript.attributes);
    }
    const script = this._extendScript(base, target, directory);
    if (script.content) {
      sfc.addScript(script.content, script.attributes);
    }
    const style = this._extendStyle(base, target, directory);
    if (style.content) {
      sfc.addStyle(style.content, style.attributes);
    }

    return sfc;
  }
  /**
   * This is a utility method used to merge script {@link SFCTag}s. It's used by both
   * {@link Extender#_extendScript} and {@link Extender#_extendModuleScript}.
   * If the extended SFC doesn't have any scripts, it will use the one from the base; but
   * if there's a script tag, it will use that instead; and if the extended script tag
   * uses the `extend` attribute, then the content of both tags will be merged.
   *
   * @param {SFCTag}  baseJS       The tag that represents all the scripts from the base
   *                               SFC.
   * @param {SFCTag}  targetJS     The tag that represents all the scripts from the
   *                               extended SFC.
   * @param {boolean} targetHasJS  Whether or not the extended SFC has any scripts.
   * @param {string}  directory    The relative directory path between the SFC that
   *                               extends and the base one; this is used to update the
   *                               relative paths on the code.
   * @returns {SFCTag}
   * @access protected
   * @ignore
   */
  _extendJSBlock(baseJS, targetJS, targetHasJS, directory) {
    let attributes;
    let content;
    if (targetHasJS) {
      if (targetJS.attributes.extend) {
        if (baseJS.content) {
          content = this._jsMerger.mergeCode(
            this._updateJSPaths(baseJS.content, directory),
            targetJS.content,
          );
        } else {
          ({ content } = targetJS);
        }

        attributes = { ...baseJS.attributes, ...targetJS.attributes };
      } else {
        ({ attributes, content } = targetJS);
      }
    } else {
      ({ attributes } = baseJS);
      content = this._updateJSPaths(baseJS.content, directory);
    }

    return {
      attributes: this._cleanAttributes(attributes),
      content: this._cleanTextBlock(content),
    };
  }
  /**
   * Generates the markup of the merge of two SFCs. If the extended SFC doesn't have the
   * `html`
   * attribute on its `<extend />` tag, the returned markup won't contain the one from the
   * base SFC.
   *
   * @param {SFCData} base       The data of the base SFC.
   * @param {SFCData} target     The data of the SFC that extends the base.
   * @param {string}  directory  The relative directory path between the SFC that extends
   *                             and the base one; this is used to update the relative
   *                             paths on the code.
   * @returns {string}
   * @access protected
   * @ignore
   */
  _extendMarkup(base, target, directory) {
    let result;
    const htmlPosition = this._getMergePosition(target.extendTagAttributes.html);
    if (htmlPosition === null) {
      result = target.markup;
    } else {
      const baseMarkup = this._updateMarkupPaths(base.markup, directory);
      if (htmlPosition === 'after') {
        result = `${baseMarkup}\n${target.markup}`;
      } else {
        result = `${target.markup}\n${baseMarkup}`;
      }
    }

    return this._cleanTextBlock(result);
  }
  /**
   * Generates a module script {@link SFCTag} (the ones with the `context="module"`
   * attribute) of the merge of two SFCs. If the extended SFC doesn't have any scripts, it
   * will use the one from the base; but if there's a script tag, it will use that
   * instead; and if the extended script tag uses the `extend` attribute, then the content
   * of both tags will be merged.
   *
   * @param {SFCData} base       The data of the base SFC.
   * @param {SFCData} target     The data of the SFC that extends the base.
   * @param {string}  directory  The relative directory path between the SFC that extends
   *                             and the base one; this is used to update the relative
   *                             paths on the code.
   * @returns {SFCTag}
   * @access protected
   * @ignore
   */
  _extendModuleScript(base, target, directory) {
    const mScript = this._extendJSBlock(
      base.moduleScript,
      target.moduleScript,
      target.hasModuleScripts,
      directory,
    );
    mScript.attributes.context = 'module';
    return mScript;
  }
  /**
   * Generates an script {@link SFCTag} of the merge of two SFCs. If the extended SFC
   * doesn't have any scripts, it will use the one from the base; but if there's a script
   * tag, it will use that instead; and if the extended script tag uses the `extend`
   * attribute, then the content of both tags will be merged.
   *
   * @param {SFCData} base       The data of the base SFC.
   * @param {SFCData} target     The data of the SFC that extends the base.
   * @param {string}  directory  The relative directory path between the SFC that extends
   *                             and the base one; this is used to update the relative
   *                             paths on the code.
   * @returns {SFCTag}
   * @access protected
   * @ignore
   */
  _extendScript(base, target, directory) {
    return this._extendJSBlock(base.script, target.script, target.hasScripts, directory);
  }
  /**
   * Generates an style {@link SFCTag} of the merge of two SFCs. If the extended SFC
   * doesn't have any styling, it will use the one from the base; but if there's a style
   * tag, it will use that instead; and if the extended style tag uses the `extend`
   * attribute, then the content of both tags will be merged.
   *
   * @param {SFCData} base       The data of the base SFC.
   * @param {SFCData} target     The data of the SFC that extends the base.
   * @param {string}  directory  The relative directory path between the SFC that extends
   *                             and the base one; this is used to update the relative
   *                             paths on the code.
   * @returns {SFCTag}
   * @access protected
   * @ignore
   */
  _extendStyle(base, target, directory) {
    const baseStyle = base.style;
    const targetStyle = target.style;
    let attributes;
    let content;
    if (target.hasStyles) {
      const stylePosition = this._getMergePosition(targetStyle.attributes.extend);
      if (stylePosition === null) {
        ({ attributes, content } = targetStyle);
      } else {
        attributes = { ...baseStyle.attributes, ...targetStyle.attributes };
        const newBaseStyle = this._updateCSSPaths(baseStyle.content, directory);
        if (stylePosition === 'after') {
          content = `${newBaseStyle}\n${targetStyle.content}`;
        } else {
          content = `${targetStyle.content}\n${newBaseStyle}`;
        }
      }
    } else {
      ({ attributes } = baseStyle);
      content = this._updateCSSPaths(baseStyle.content, directory);
    }

    return {
      attributes: this._cleanAttributes(attributes),
      content: this._cleanTextBlock(content),
    };
  }
  /**
   * The method that actually generates the "final SFC".
   *
   * @param {SFCData} sfc           The SFC information.
   * @param {number}  maxDepth      How many components can be extended. For example, if a
   *                                file extends from one that extends from another and
   *                                the parameter is set to `1`, the parsing will fail.
   * @param {number}  currentDepth  The level of depth in which a file is currently being
   *                                extended.
   * @returns {SFCData}
   * @throws {Error} If the "extend chain" goes beyond the `maxDepth` limit.
   * @access protected
   * @ignore
   */
  _generate(sfc, maxDepth, currentDepth) {
    let result;
    if (sfc.hasBaseFileData) {
      const newCurrentDepth = currentDepth + 1;
      if (maxDepth && newCurrentDepth > maxDepth) {
        throw new Error(
          `The file '${sfc.filepath}' can't extend from another file, the max depth ` +
            `limit is set to ${maxDepth}`,
        );
      }

      const base = this._generate(sfc.baseFileData, maxDepth, newCurrentDepth);
      result = this._extend(base, sfc);
    } else {
      result = sfc;
    }

    return result;
  }
  /**
   * A utility method that parses the value of an `extend` HTML attribute the class uses
   * to determine the position of the base code in relation with the extended one:
   * - `undefined` or `'false'`: `null` - the code won't be merged.
   * - no value, `'true'` or `'after'`: first the base code and then the extended one.
   * - `'before'`: first the extended code and then the base one.
   *
   * @param {string} [value]  The value of the `extend` HTML attribute.
   * @returns {?string} If the attribute is not defined or if it's value is `'false'`, it
   *                    will return `null`, indicating that the code shouldn't be merged.
   * @access protected
   * @ignore
   */
  _getMergePosition(value) {
    const defaultValue = 'after';
    let result;
    const valueType = typeof value;
    if (valueType === 'undefined' || !value) {
      result = null;
    } else if (valueType === 'string') {
      result = value.match(/(?:before|after)/i) ? value.toLowerCase() : defaultValue;
    } else {
      result = defaultValue;
    }

    return result;
  }
  /**
   * Utility method that updates paths on a given code to make them relative to a new
   * directory.
   * This is used to update the contents of an SFC before they are added to one that
   * extends it.
   *
   * @param {string} code        The code to update.
   * @param {RegExp} expression  The expression to extract the relative paths.
   * @param {string} directory   The relative path to the directory in which the extended
   *                             SFC is located.
   * @returns {string}
   * @access protected
   * @ignore
   */
  _updateCodePaths(code, expression, directory) {
    const items = [];
    let match = expression.exec(code);
    while (match) {
      const [statement, itemPath, alternativeItemPath] = match;
      items.push({
        statement,
        itemPath: itemPath || alternativeItemPath,
      });

      match = expression.exec(code);
    }

    const newCode = items.reduce((currentCode, item) => {
      const newItemPath = path.join(directory, item.itemPath).replace(/^(\w)/, './$1');
      const newStatement = item.statement.replace(item.itemPath, newItemPath);
      return currentCode.replace(item.statement, newStatement);
    }, code);

    return newCode;
  }
  /**
   * Updates relative paths on a block of CSS code to be relative for a give directory.
   * This is used when a block of CSS code is going to be added on a extended SFC.
   *
   * @param {string} css        The code to update.
   * @param {string} directory  The relative path to the directory in which the extended
   *                            SFC is located.
   * @returns {string}
   * @access protected
   * @ignore
   */
  _updateCSSPaths(css, directory) {
    return this._updateCodePaths(css, this._expressions.cssUrl, directory);
  }
  /**
   * Updates relative paths on a block of JS code to be relative for a give directory.
   * This is used when a block of JS code is going to be added on a extended SFC.
   *
   * @param {string} js         The code to update.
   * @param {string} directory  The relative path to the directory in which the extended
   *                            SFC is located.
   * @returns {string}
   * @access protected
   * @ignore
   */
  _updateJSPaths(js, directory) {
    return this._updateCodePaths(js, this._expressions.jsPaths, directory);
  }
  /**
   * Updates relative paths on a block of HTML code to be relative for a give directory.
   * This is used when a block of HTML code is going to be added on a extended SFC.
   *
   * @param {string} markup     The code to update.
   * @param {string} directory  The relative path to the directory in which the extended
   *                            SFC is located.
   * @returns {string}
   * @access protected
   * @ignore
   */
  _updateMarkupPaths(markup, directory) {
    return this._updateCSSPaths(
      this._updateCodePaths(markup, this._expressions.htmlSrc, directory),
      directory,
    );
  }
}
/**
 * The service provider that once registered on {@link SvelteExtend} will save the an
 * instance of {@link JSMerger} as the `jsMerger` service.
 *
 * @type {Provider}
 */
const extender = provider((app) => {
  app.set('extender', () => new Extender(app.get('jsMerger'), app.get('sfcData')));
});

module.exports = {
  Extender,
  extender,
};
