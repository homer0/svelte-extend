const path = require('path');
const { provider } = require('jimple');
const fs = require('fs-extra');

class SFCParser {
  constructor(sfcData) {
    this._sfcData = sfcData;
    this._expressions = {
      extendTag: /<\s*extend\s+(.*?)\s*>(?:\s*<\s*\/\s*extend\s*>)/i,
      attributes: /([\w-]+)(?:\s*=\s*['"](.*?)['"]|\s*|$)/g,
      boolean: /(?:true|false)/i,
      relevantTags: /<\s*(\/\s*)?(script|style)(.*?)>/gi,
    };
  }

  parseFromPath(filepath, maxDepth = 0) {
    return fs.readFile(filepath, 'utf-8')
    .then((contents) => this.parse(contents, filepath, maxDepth));
  }

  parse(contents, filepath, maxDepth = 0) {
    return this._parse(contents, filepath, maxDepth, 1);
  }

  _parse(contents, filepath, maxDepth, currentDepth, extendTag = null) {
    let result;
    const useExtendTag = extendTag || this._getExtendTag(contents);
    if (useExtendTag && useExtendTag.attributes.from) {
      const newCurrentDepth = currentDepth + 1;
      if (maxDepth && newCurrentDepth > maxDepth) {
        result = Promise.reject(new Error(
          `The file '${filepath}' can't extend from another file, the max depth ` +
          `limit is set to ${maxDepth}`
        ));
      } else {
        const filedir = path.dirname(filepath);
        const fromFilepath = path.join(filedir, useExtendTag.attributes.from);
        result = fs.pathExists(fromFilepath)
        .then((exists) => {
          let nextStep;
          if (exists) {
            nextStep = this._loadDataFromPath(fromFilepath, maxDepth, newCurrentDepth);
          } else {
            nextStep = Promise.reject(new Error(
              `Unable to load '${useExtendTag.attributes.from}' from '${filepath}'`
            ));
          }

          return nextStep;
        })
        .then((data) => {
          const file = this._createDataObject(
            filepath,
            this._parseFileData(contents.replace(useExtendTag.statement, ''))
          );

          const useData = data instanceof this._sfcData ?
            data :
            this._createDataObject(fromFilepath, data);

          file.addBaseFileData(useData, useExtendTag.attributes);
          return file;
        });
      }
    } else {
      result = Promise.resolve(null);
    }

    return result;
  }

  _createDataObject(filepath, parsedResults) {
    const data = this._sfcData.new(filepath);
    data.addMarkup(parsedResults.markup);
    parsedResults.script.forEach((script) => {
      const { tag, content } = script;
      data.addScript(content, tag.attributes);
    });

    parsedResults.style.forEach((style) => {
      const { tag, content } = style;
      data.addStyle(content, tag.attributes);
    });

    return data;
  }

  _loadDataFromPath(filepath, maxDepth, newCurrentDepth) {
    return fs.readFile(filepath, 'utf-8')
    .then((contents) => {
      let nextStep;
      const extendTag = this._getExtendTag(contents);
      if (extendTag) {
        nextStep = this._parse(
          contents,
          filepath,
          maxDepth,
          newCurrentDepth,
          extendTag
        );
      } else {
        nextStep = this._parseFileData(contents);
      }

      return nextStep;
    });
  }

  _parseFileData(contents) {
    let currentLines = [];
    let currentOpenTag = null;
    const result = {
      script: [],
      style: [],
      markup: '',
    };
    const markupLines = [];
    contents
    .split('\n')
    .forEach((line) => {
      const tags = this._getRelevantTags(line);
      if (tags.length) {
        if (tags.length > 1) {
          const subLines = [];
          let currentSubLine = line;
          tags.forEach((tag) => {
            const tagIndex = currentSubLine.indexOf(tag.statement);
            if (tagIndex) {
              subLines.push(currentSubLine.substr(0, tagIndex));
            }

            subLines.push(tag);
            currentSubLine = currentSubLine.substr(tagIndex + tag.statement.length);
          });

          subLines.forEach((subLine) => {
            if (typeof subLine === 'string') {
              currentLines.push(subLine);
            } else {
              const tag = subLine;
              if (currentOpenTag) {
                if (currentOpenTag.name === tag.name && tag.closing) {
                  result[currentOpenTag.name].push({
                    tag: currentOpenTag,
                    content: currentLines.join('\n'),
                  });
                  currentOpenTag = null;
                  currentLines = [];
                } else {
                  currentLines.push(line);
                }
              } else if (!tag.closing) {
                markupLines.push(...currentLines);
                currentLines = [];
                currentOpenTag = tag;
              } else {
                currentLines.push(line);
              }
            }
          });
        } else {
          const [tag] = tags;
          if (currentOpenTag) {
            if (currentOpenTag.name === tag.name && tag.closing) {
              result[currentOpenTag.name].push({
                tag: currentOpenTag,
                content: currentLines.join('\n'),
              });
              currentOpenTag = null;
              currentLines = [];
            } else {
              currentLines.push(line);
            }
          } else if (!tag.closing) {
            markupLines.push(...currentLines);
            currentLines = [];
            currentOpenTag = tag;
          } else {
            currentLines.push(line);
          }
        }
      } else {
        currentLines.push(line);
      }
    });

    if (currentLines.length) {
      markupLines.push(...currentLines);
    }

    result.markup = markupLines
    .filter((line) => !!line.trim())
    .join('\n');

    return result;
  }

  _getRelevantTags(line) {
    const result = [];
    let match = this._expressions.relevantTags.exec(line);
    while (match) {
      const [statement, slash, tagName, rawAttributes] = match;
      const name = tagName.trim();
      const closing = typeof slash !== 'undefined';
      const attributes = this._getTagAttributes(rawAttributes);
      result.push({
        statement,
        name,
        closing,
        attributes,
      });

      match = this._expressions.relevantTags.exec(line);
    }

    return result;
  }

  _getExtendTag(contents) {
    let result;
    const match = this._expressions.extendTag.exec(contents);
    if (match) {
      const [statement, rawAttributes] = match;
      const attributes = this._getTagAttributes(rawAttributes);
      result = {
        statement,
        attributes,
      };
    } else {
      result = null;
    }

    return result;
  }

  _getTagAttributes(rawAttributes) {
    const result = {};
    let match = this._expressions.attributes.exec(rawAttributes);
    while (match) {
      let [, name, value] = match;
      name = name.trim();
      if (value) {
        value = value.trim();
        if (value.match(this._expressions.boolean)) {
          value = value.toLowerCase() === 'true';
        }
      } else {
        value = true;
      }

      result[name] = value;

      match = this._expressions.attributes.exec(rawAttributes);
    }

    return result;
  }
}

const sfcParser = provider((app) => {
  app.set('sfcParser', () => new SFCParser(app.get('sfcData')));
});

module.exports = {
  SFCParser,
  sfcParser,
};
