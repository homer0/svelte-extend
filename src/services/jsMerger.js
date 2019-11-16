const babylon = require('babylon');
const babelTraverse = require('@babel/traverse').default;
const babelTypes = require('@babel/types');
const babelGenerator = require('@babel/generator').default;
const { provider } = require('jimple');

class JSMerger {
  constructor() {
    this._getBindingName = this._getBindingName.bind(this);
    this._getVariableName = this._getVariableName.bind(this);
    this._getFunctionName = this._getFunctionName.bind(this);
  }

  mergeCode(base, extended) {
    const baseData = this._getCodeData(base);
    const extendedData = this._getCodeData(extended);

    if (baseData.firstContentNode) {
      extendedData
      .imports
      .reverse()
      .reduce(
        (prevNode, importNode) => {
          const { node: toAdd } = importNode;
          importNode.remove();
          const [newNode] = prevNode.insertBefore(toAdd);
          return newNode;
        },
        baseData.firstContentNode
      );
    }

    this._extendPaths(
      baseData.bindings,
      extendedData.bindings,
      this._getBindingName
    );
    this._extendPaths(
      baseData.variables,
      extendedData.variables,
      this._getVariableName
    );
    this._extendPaths(
      baseData.functions,
      extendedData.functions,
      this._getFunctionName
    );

    const { code: baseCode } = babelGenerator(baseData.ast, {}, base);
    const { code: extendedCode } = babelGenerator(extendedData.ast, {}, extended);

    return `${baseCode}\n${extendedCode}`;
  }

  _extendPaths(basePaths, extendedPaths, nameFn) {
    const pathsByName = basePaths.reduce(
      (acc, nodePath) => Object.assign({}, acc, {
        [nameFn(nodePath)]: {
          base: nodePath,
        },
      }),
      {}
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

  _getBindingName(nodePath) {
    return nodePath.node.declaration.declarations[0].id.name;
  }

  _getVariableName(nodePath) {
    return nodePath.node.declarations[0].id.name;
  }

  _getFunctionName(nodePath) {
    return nodePath.node.id.name;
  }
}

const jsMerger = provider((app) => {
  app.set('jsMerger', () => new JSMerger());
});

module.exports = {
  JSMerger,
  jsMerger,
};
