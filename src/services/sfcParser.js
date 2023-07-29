const path = require('path');
const fs = require('fs/promises');
const { provider } = require('jimple');

/**
 * @typedef {Object} SFCParserResultTag
 * @property {string}  statement   The tag full statement (match) for the tag.
 * @property {string}  name        The name of the tag.
 * @property {boolean} closing     Whether or not the tag is for closign (`</`).
 * @property {Object}  attributes  A dictionary with the tag attributes.
 * @ignore
 */

/**
 * @typedef {Object} SFCParserResult
 * @property {string}             content  The contents of a style/script tag.
 * @property {SFCParserResultTag} tag      The tag information.
 * @ignore
 */

/**
 * @typedef {Object} SFCParserResults
 * @property {SFCParserResult[]} script  A list of the script tags found on the SFC.
 * @property {SFCParserResult[]} style   A list of the style tags found on the SFC.
 * @property {string}            markup  The HTML markup of the SFC.
 * @ignore
 */

/**
 * @typedef {Object} SFCParserExtendTag
 * @property {string} statement   The tag full statement (match) for the tag.
 * @property {Object} attributes  A dictionary with the tag attributes.
 * @ignore
 */

/**
 * This is the parser that reads a single file component (SFC) and transform it into a
 * {@link SFCData} object.
 */
class SFCParser {
  /**
   * @param {Class<SFCData>} sfcData  The class used to create the objects with the SFC
   *                                  parsed information.
   */
  constructor(sfcData) {
    /**
     * The class used to create the objects with the SFC parsed information.
     *
     * @type {Class<SFCData>}
     * @access protected
     * @ignore
     */
    this._sfcData = sfcData;
    /**
     * A dictionary of regular expression the parser uses.
     *
     * @type {Object}
     * @property {RegExp} extendTag     The expression that detects the `<extend />` tag.
     * @property {RegExp} attributes    A expression that matches HTML attributes (outside
     *                                  a tag).
     * @property {RegExp} boolean       A expression to detect whether or not a string is
     *                                  actually a boolean flag.
     * @property {RegExp} relevantTags  A expression that matches relevant tags for the
     *                                  parser from a line of code.
     * @access protected
     * @ignore
     */
    this._expressions = {
      extendTag: /<\s*extend\s+(.*?)\s*\/?>(?:\s*<\s*\/\s*extend\s*>)?/i,
      attributes: /([\w-]+)(?:\s*=\s*['"](.*?)['"]|\s*|$)/g,
      boolean: /(?:true|false)/i,
      relevantTags: /<\s*(\/\s*)?(script|style)(.*?)>/gi,
    };
  }
  /**
   * Parses a SFC.
   *
   * @param {string} contents      The contents of the file.
   * @param {string} filepath      The path of the file.
   * @param {number} [maxDepth=0]  How many components can be extended. For example, if a
   *                               file extends from one that extends from another and the
   *                               parameter is set to `1`, the parsing will fail.
   * @returns {Promise<?SFCData, Error>} If the file doesn't implement the `<extend />`
   *                                     tag, the promise will resolve with `null`.
   */
  parse(contents, filepath, maxDepth = 0) {
    return this._parse(contents, filepath, maxDepth, 1);
  }
  /**
   * Parses a SFC by loading the file first; after the file is loaded, the method will
   * internally call {@link SFCParser#parse}.
   *
   * @param {string} filepath      The path of the file.
   * @param {number} [maxDepth=0]  How many components can be extended. For example, if a
   *                               file extends from one that extends from another and the
   *                               parameter is set to `1`, the parsing will fail.
   * @returns {Promise<?SFCData, Error>} If the file doesn't implement the `<extend />`
   *                                     tag, the promise will resolve with `null`.
   */
  async parseFromPath(filepath, maxDepth = 0) {
    const contents = await fs.readFile(filepath, 'utf-8');
    return this.parse(contents, filepath, maxDepth);
  }
  /**
   * Creates an instance of {@link SFCData} with the parsed results of an SFC.
   *
   * @param {string}           filepath       The path of the SFC.
   * @param {SFCParserResults} parsedResults  The information obtained from parsing the
   *                                          SFC.
   * @returns {SFCData}
   * @access protected
   * @ignore
   */
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
  /**
   * Finds and parses the information of an `<extend />` tag on a SFC.
   *
   * @param {string} contents  The contents of the SFC.
   * @returns {?SFCParserExtendTag}
   * @access protected
   * @ignore
   */
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
  /**
   * Finds a relevant tag for the parser on a line of code.
   *
   * @param {string} line        The line to parse.
   * @param {number} lineNumber  The number of the line, on the SFC.
   * @param {string} filepath    The path of the SFC.
   * @returns {?SFCParserResultTag}
   * @throws {Error} If it finds two relevant tags (style/script) on the same line.
   * @access protected
   * @ignore
   */
  _getRelevantTag(line, lineNumber, filepath) {
    let result;
    const match = this._expressions.relevantTags.exec(line);
    if (match) {
      const [statement, slash, tagName, rawAttributes] = match;
      const name = tagName.trim();
      const closing = typeof slash !== 'undefined';
      const attributes = this._getTagAttributes(rawAttributes);
      result = {
        statement,
        name,
        closing,
        attributes,
      };

      if (this._expressions.relevantTags.exec(line)) {
        const errorMessage = [
          'The parser cant handle multiple script/style tags on the same line (sorry!)',
          `- file: ${filepath}`,
          `- line: ${lineNumber}`,
          `- code: ${line}`,
        ].join('\n');
        throw new Error(errorMessage);
      }
    } else {
      result = null;
    }

    return result;
  }
  /**
   * Parses a string of HTML tag attributes into an object.
   * If an attribute doesn't have a value, its value will be `true` (boolean, no string);
   * and if a value is a string for a boolean (`'true'` or `'false'`), it will become a
   * real boolean.
   *
   * @param {string} rawAttributes  The attributes to parse.
   * @returns {Object}
   * @access protected
   * @example
   *
   *   console.log(parser._getTagAttributes('from="file" html'));
   *   // { from: 'file', html: true }
   *   console.log(parser._getTagAttributes('from="file" html="false"'));
   *   // { from: 'file', html: false }
   *
   * @ignore
   */
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
  /**
   * Loads a SFC and checks if it implements an `<extend />` tag; if it does, it calls
   * {@link SFCParser#_parse} to parse its "base SFC" first; otherwise, it parses its
   * contents directly.
   *
   * @param {string} filepath      The path of the file.
   * @param {number} maxDepth      How many components can be extended. For example, if a
   *                               file extends from one that extends from another and the
   *                               parameter is set to `1`, the parsing will fail.
   * @param {number} currentDepth  The level of depth in which a file is currently being
   *                               extended.
   * @returns {Promise<SFCData | SFCParserResults, Error>}
   * @access protected
   * @ignore
   */
  async _loadDataFromPath(filepath, maxDepth, currentDepth) {
    const contents = await fs.readFile(filepath, 'utf-8');
    const extendTag = this._getExtendTag(contents);
    if (extendTag) {
      return this._parse(contents, filepath, maxDepth, currentDepth, extendTag);
    }

    return this._parseFileData(contents, filepath);
  }
  /**
   * The method that actually does the parsing. The reason this is not in
   * {@link SFCParser#parse}
   * is because this method can be called recursively for each "level of extension a file
   * has".
   *
   * @param {string}              contents          The contents of the file.
   * @param {string}              filepath          The path of the file.
   * @param {number}              maxDepth          How many components can be extended.
   *                                                For example, if a file extends from
   *                                                one that extends from another and the
   *                                                parameter is set to `1`, the parsing
   *                                                will fail.
   * @param {number}              currentDepth      The level of depth in which a file is
   *                                                currently being extended.
   * @param {?SFCParserExtendTag} [extendTag=null]  When this method is called internally,
   *                                                it's because another method found an
   *                                                `<extend />` tag by reading a file and
   *                                                needs the file parsed, so instead of
   *                                                looking for the tag again, the tag can
   *                                                be provided with this parameter.
   * @returns {Promise<?SFCData, Error>} If the file doesn't implement the `<extend />`
   *                                     tag, the promise will resolve with `null`.
   * @access protected
   * @ignore
   */
  async _parse(contents, filepath, maxDepth, currentDepth, extendTag = null) {
    const useExtendTag = extendTag || this._getExtendTag(contents);
    if (!useExtendTag || !useExtendTag.attributes.from) {
      return null;
    }

    const newCurrentDepth = currentDepth + 1;
    if (maxDepth && newCurrentDepth > maxDepth) {
      throw new Error(
        `The file '${filepath}' can't extend from another file, the max depth ` +
          `limit is set to ${maxDepth}`,
      );
    }

    const filedir = path.dirname(filepath);
    const fromFilepath = path.join(filedir, useExtendTag.attributes.from);
    const exists = await fs
      .access(fromFilepath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      throw new Error(
        `Unable to load '${useExtendTag.attributes.from}' from '${filepath}'`,
      );
    }

    const data = await this._loadDataFromPath(fromFilepath, maxDepth, newCurrentDepth);
    const file = this._createDataObject(
      filepath,
      this._parseFileData(contents.replace(useExtendTag.statement, ''), filepath),
    );
    const useData =
      data instanceof this._sfcData ? data : this._createDataObject(fromFilepath, data);

    file.addBaseFileData(useData, useExtendTag.attributes);
    return file;
  }
  /**
   * Parses a SFC code and extract the information about its scripts, styling and markup.
   *
   * @param {string} contents  The contents of the SFC.
   * @param {string} filepath  The path of the SFC.
   * @returns {SFCParserResults}
   * @access protected
   * @ignore
   */
  _parseFileData(contents, filepath) {
    /**
     * This will work as an accumulator that will take lines when a open tag is detected. When
     * the closing tag is detected, all those lines will be associated to the tag, saved, and the
     * accumulator resetted.
     */
    let currentLines = [];
    // This will be the information of the currently open tag the parser found.
    let currentOpenTag = null;
    // The dictionary with the information the method will eventually return.
    const result = {
      script: [],
      style: [],
      markup: '',
    };
    /**
     * This is a safeguard in case the parser found an open tag inside another open tag (always
     * talking about script and style). If a tag for opening is found inside one that is already
     * opened, its counter will increment; if a closing tag is found and it's counter is not `0`,
     * instead of closing the tag, the counter will decrement and the tag will be handled as a
     * "content line".
     *
     * Not the best solution, and it's a pretty edge case, but you can't use conventional HTML
     * parsers when with the Svelte DSL in the middle... I tried.
     */
    const ignoreNextCounters = {
      script: 0,
      style: 0,
    };
    /**
     * A list that will save all lines that are outside a script/style tag. They'll eventually be
     * filtered to remove the empty ones, and joined into a string.
     */
    const markupLines = [];
    // Let the parsing beging!
    contents
      // Separate the file by its lines.
      .split('\n')
      // And for each line...
      .forEach((line, index) => {
        // Try to find a relevant tag for the parser, script or style.
        const tag = this._getRelevantTag(line, index + 1, filepath);
        if (tag) {
          // If a tag was found, remove the tag form the line...
          const rest = line.replace(tag.statement, '').trim();
          /**
           * And if the line still has content, and no tag is currently open, or another tag
           * with the same name is open, or the tag that was removed is for closing the opened
           * tag... consider it markup.
           * Like the counters, this is for edge cases.
           */
          if (
            rest &&
            (!currentOpenTag || currentOpenTag.name !== tag.name || tag.closing)
          ) {
            markupLines.push(rest);
          }
          if (currentOpenTag) {
            // If a tag is currently open...
            if (currentOpenTag.name === tag.name && tag.closing) {
              // And the tag found is for closing it...
              if (ignoreNextCounters[tag.name]) {
                // If the counter is not `0`, decrement it and ignore the tag, just save the line.
                ignoreNextCounters[tag.name]--;
                currentLines.push(line);
              } else {
                /**
                 * But if it's an actual closing tag, save all the accumulated lines, its reference
                 * and reset the accumulator.
                 */
                result[currentOpenTag.name].push({
                  tag: currentOpenTag,
                  content: currentLines.join('\n'),
                });
                currentOpenTag = null;
                currentLines = [];
              }
            } else {
              // But if the tag is not the one for closing, ignore it and save the line.
              if (currentOpenTag.name === tag.name) {
                ignoreNextCounters[tag.name]++;
              }
              currentLines.push(line);
            }
          } else {
            // If no tag is open, send all the accumulated lines to the markup and open the tag.
            markupLines.push(...currentLines);
            currentLines = [];
            currentOpenTag = tag;
          }
        } else {
          // If no tag was found, just save the line.
          currentLines.push(line);
        }
      });

    // All lines that are not inside a tag, go to the markup.
    if (currentLines.length) {
      markupLines.push(...currentLines);
    }

    // Remove empty lines from the markup and transform it into text.
    result.markup = markupLines.filter((line) => !!line.trim()).join('\n');

    return result;
  }
}
/**
 * The service provider that once registered on {@link SvelteExtend} will save the an
 * instance of {@link SFCParser} as the `sfcParser` service.
 *
 * @type {Provider}
 */
const sfcParser = provider((app) => {
  app.set('sfcParser', () => new SFCParser(app.get('sfcData')));
});

module.exports = {
  SFCParser,
  sfcParser,
};
