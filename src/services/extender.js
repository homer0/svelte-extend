const path = require('path');
const { provider } = require('jimple');

class Extender {
  constructor(jsMerger, sfcData) {
    this._jsMerger = jsMerger;
    this._sfcData = sfcData;
    this._expressions = {
      htmlSrc: /\s+(?:src="(\.[^"]+)"|src=(')(\.[^']+)')/ig,
      cssUrl: /url\s*\(\s*(?:['"])?(\.[^"']+)(?:['"])?\)/ig,
      jsPaths: /(?: |^)(?:(?:from|import)\s+(?:["'](\.[^"']+)["'])|require\s*\(\s*["'](\.[^"']+)["']\s*\))/igm,
    };
    this._privateAttributes = ['extend'];
  }

  generate(sfc, maxDepth = 0) {
    return this._generate(sfc, maxDepth, 1);
  }

  _generate(sfc, maxDepth, currentDepth) {
    let result;
    if (sfc.hasBaseFileData) {
      const newCurrentDepth = currentDepth + 1;
      if (maxDepth && newCurrentDepth > maxDepth) {
        throw new Error(
          `The file '${sfc.filepath}' can't extend from another file, the max depth ` +
          `limit is set to ${maxDepth}`
        );
      }

      const base = this._generate(sfc.baseFileData, maxDepth, newCurrentDepth);
      result = this._extend(base, sfc);
    } else {
      result = sfc;
    }

    return result;
  }

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
        attributes = Object.assign({}, baseStyle.attributes, targetStyle.attributes);
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

  _extendScript(base, target, directory) {
    return this._extendJSBlock(
      base.script,
      target.script,
      target.hasScripts,
      directory
    );
  }

  _extendModuleScript(base, target, directory) {
    const mScript = this._extendJSBlock(
      base.moduleScript,
      target.moduleScript,
      target.hasModuleScripts,
      directory
    );
    mScript.attributes.context = 'module';
    return mScript;
  }

  _extendJSBlock(baseJS, targetJS, targetHasJS, directory) {
    let attributes;
    let content;
    if (targetHasJS) {
      if (targetJS.attributes.extend) {
        if (baseJS.content) {
          content = this._jsMerger.mergeCode(
            this._updateJSPaths(baseJS.content, directory),
            targetJS.content
          );
        } else {
          ({ content } = targetJS);
        }

        attributes = Object.assign({}, baseJS.attributes, targetJS.attributes);
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

  _updateJSPaths(js, directory) {
    return this._updateCodePaths(
      js,
      this._expressions.jsPaths,
      directory
    );
  }

  _updateMarkupPaths(markup, directory) {
    return this._updateCSSPaths(
      this._updateCodePaths(markup, this._expressions.htmlSrc, directory),
      directory
    );
  }

  _updateCSSPaths(css, directory) {
    return this._updateCodePaths(css, this._expressions.cssUrl, directory);
  }

  _updateCodePaths(code, expression, directory) {
    const items = [];
    let match = expression.exec(code);
    while (match) {
      const [statement, itemPath] = match;
      items.push({
        statement,
        itemPath,
      });

      match = expression.exec(code);
    }

    const newCode = items.reduce(
      (currentCode, item) => {
        const newItemPath = path.join(directory, item.itemPath).replace(/^(\w)/, './$1');
        const newStatement = item.statement.replace(item.itemPath, newItemPath);
        return currentCode.replace(item.statement, newStatement);
      },
      code
    );

    return newCode;
  }

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

  _cleanTextBlock(text) {
    const newText = text
    .replace(/^\n/, '')
    .replace(/\n$/, '');

    return newText.trim() ? newText : '';
  }

  _cleanAttributes(attributes) {
    const result = Object.assign({}, attributes);
    this._privateAttributes.forEach((name) => {
      delete result[name];
    });

    return result;
  }
}

const extender = provider((app) => {
  app.set('extender', () => new Extender(
    app.get('jsMerger'),
    app.get('sfcData')
  ));
});

module.exports = {
  Extender,
  extender,
};
