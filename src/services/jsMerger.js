const babylon = require('babylon');
const babelTraverse = require('@babel/traverse').default;
const babelTypes = require('@babel/types');
const babelGenerator = require('@babel/generator').default;
const { provider } = require('jimple');

/**
 * Gets the name/ID of an AST node declaration.
 *
 * @callback JSMergerNameFuntion
 * @param {Object} nodePath  The AST node path object that contains the declaration.
 * @returns {string}
 * @ignore
 */

/**
 * @property {Object}  ast               The AST of the JS block code.
 * @property {Array}   imports           A list of all the import declarations on the
 *                                       block.
 * @property {Array}   variables         A list of all the variables declarations on the
 *                                       block.
 * @property {Array}   bindings          A list of all the bindings declarations on the
 *                                       block.
 * @property {Array}   functions         A list of all the functions declarations on the
 *                                       block.
 * @property {?Object} firstContentNode  A reference to the first node on the block that
 *                                       is not an import declaration. This is used as an
 *                                       "anchor" to move all the import declarations from
 *                                       the extend block to before this node.
 * @typdef {Object} JSMergerCodeData
 * @ignore
 */

/**
 * This class takes care of merging two blocks of JS code by parsing their ASTs and getting rid
 * of duplicated variables, "bindings" and functions. By "binding", it referes to the named
 * exports Svelte uses as props/bindings/attributes for the components.
 */
class JSMerger {
  /**
   * @ignore
   */
  constructor() {
    /**
     * @ignore
     */
    this._getBindingName = this._getBindingName.bind(this);
    /**
     * @ignore
     */
    this._getVariableName = this._getVariableName.bind(this);
    /**
     * @ignore
     */
    this._getFunctionName = this._getFunctionName.bind(this);
  }
  /**
   * Merges two blocks of JS code.
   *
   * @param {string} base      The code that is being overwritten/extended.
   * @param {string} extended  The code that overwrites/extends.
   * @returns {string}
   */
  mergeCode(base, extended) {
    const baseData = this._getCodeData(base);
    const extendedData = this._getCodeData(extended);

    if (baseData.firstContentNode) {
      extendedData.imports.reverse().reduce((prevNode, importNode) => {
        const { node: toAdd } = importNode;
        importNode.remove();
        const [newNode] = prevNode.insertBefore(toAdd);
        return newNode;
      }, baseData.firstContentNode);
    }

    this._extendPaths(baseData.bindings, extendedData.bindings, this._getBindingName);
    this._extendPaths(baseData.variables, extendedData.variables, this._getVariableName);
    this._extendPaths(baseData.functions, extendedData.functions, this._getFunctionName);

    const { code: baseCode } = babelGenerator(baseData.ast, {}, base);
    const { code: extendedCode } = babelGenerator(extendedData.ast, {}, extended);

    return `${baseCode}\n${extendedCode}`;
  }
  /**
   * Processes a list of declarations of the same type (variables, bindings or functions)
   * and replaces the original definitions with the extended ones.
   *
   * @param {Array}               basePaths      The list of declarations from the
   *                                             "original block".
   * @param {Array}               extendedPaths  The list of declarations from the
   *                                             "extended block".
   * @param {JSMergerNameFuntion} nameFn         The function that returns the name/ID of
   *                                             the declaration.
   * @access protected
   * @ignore
   */
  _extendPaths(basePaths, extendedPaths, nameFn) {
    const pathsByName = basePaths.reduce(
      (acc, nodePath) =>
        Object.assign({}, acc, {
          [nameFn(nodePath)]: {
            base: nodePath,
          },
        }),
      {},
    );

    extendedPaths.forEach((nodePath) => {
      const name = nameFn(nodePath);
      if (pathsByName[name]) {
        pathsByName[name].extended = nodePath;
      }
    });

    Object.keys(pathsByName).forEach((name) => {
      const nodePath = pathsByName[name];
      if (nodePath.extended) {
        const { node: toMove } = nodePath.extended;
        nodePath.extended.remove();
        nodePath.base.insertAfter(toMove);
        nodePath.base.remove();
      }
    });
  }
  /**
   * Parses a block of JS code in order to get the relevant information the class needs in
   * order to do a merge.
   *
   * @param {string} code  The block of JS code to parse.
   * @returns {JSMergerCodeData}
   * @access protected
   * @ignore
   */
  _getCodeData(code) {
    const ast = babylon.parse(code, {
      sourceType: 'module',
    });

    const imports = [];
    const variables = [];
    const bindings = [];
    const functions = [];
    let firstContentNode = null;
    babelTraverse(ast, {
      enter: (nodePath) => {
        const isRoot = nodePath.parent && babelTypes.isProgram(nodePath.parent);
        if (babelTypes.isImportDeclaration(nodePath)) {
          imports.push(nodePath);
        } else if (!firstContentNode && isRoot) {
          firstContentNode = nodePath;
        }

        if (babelTypes.isVariableDeclaration(nodePath) && nodePath.parent) {
          if (isRoot) {
            variables.push(nodePath);
          } else if (babelTypes.isExportNamedDeclaration(nodePath.parent)) {
            bindings.push(nodePath.parentPath);
          }
        } else if (babelTypes.isFunctionDeclaration(nodePath) && isRoot) {
          functions.push(nodePath);
        }
      },
    });

    return {
      ast,
      imports,
      variables,
      bindings,
      functions,
      firstContentNode,
    };
  }
  /**
   * Gets the name of a binding declaration. By "binding", it referes to the named exports
   * Svelte uses as props/bindings/attributes for the components.
   *
   * @param {Object} nodePath  The AST node path object that contains the declaration.
   * @returns {string}
   * @access protected
   * @ignore
   */
  _getBindingName(nodePath) {
    return nodePath.node.declaration.declarations[0].id.name;
  }
  /**
   * Gets the name of a variable declaration.
   *
   * @param {Object} nodePath  The AST node path object that contains the declaration.
   * @returns {string}
   * @access protected
   * @ignore
   */
  _getVariableName(nodePath) {
    return nodePath.node.declarations[0].id.name;
  }
  /**
   * Gets the name of a function declaration.
   *
   * @param {Object} nodePath  The AST node path object that contains the declaration.
   * @returns {string}
   * @access protected
   * @ignore
   */
  _getFunctionName(nodePath) {
    return nodePath.node.id.name;
  }
}
/**
 * The service provider that once registered on {@link SvelteExtend} will save the an
 * instance of {@link JSMerger} as the `jsMerger` service.
 *
 * @type {Provider}
 */
const jsMerger = provider((app) => {
  app.set('jsMerger', () => new JSMerger());
});

module.exports = {
  JSMerger,
  jsMerger,
};
