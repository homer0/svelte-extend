/* eslint-disable global-require */
jest.mock('@homer0/jimple', () => require('../mocks/jimple.mock'));
jest.mock('@babel/types', () => require('../mocks/babelTypes.mock'));
jest.mock('@babel/traverse', () => require('../mocks/babelTraverse.mock'));
/* eslint-enable global-require */
jest.mock('babylon');
jest.mock('@babel/generator');
jest.unmock('../../src/services/jsMerger');

const babylon = require('babylon');
const babelGenerator = require('@babel/generator').default;
const babelTraverse = require('../mocks/babelTraverse.mock');
const babelTypes = require('../mocks/babelTypes.mock');
const { JSMerger, jsMerger } = require('../../src/services/jsMerger');

describe('JSMerger', () => {
  beforeEach(() => {
    babylon.parse.mockReset();
    babelTraverse.mockClear();
    babelTypes.mockClear();
    babelGenerator.mockReset();
  });

  it('should be instantiated', () => {
    // Given
    let sut = null;
    // When
    sut = new JSMerger();
    // Then
    expect(sut).toBeInstanceOf(JSMerger);
  });

  it('should merge two JS blocks', () => {
    // Given
    const baseCode = 'base-code';
    const baseAST = 'base-ast';
    babylon.parse.mockImplementationOnce(() => baseAST);
    babelGenerator.mockImplementationOnce(() => ({ code: baseCode }));
    const extendedAST = 'extended-ast';
    const extendedCode = 'extended-code';
    babylon.parse.mockImplementationOnce(() => extendedAST);
    babelGenerator.mockImplementationOnce(() => ({ code: extendedCode }));
    let sut = null;
    let result = null;
    // When
    sut = new JSMerger();
    result = sut.mergeCode(baseCode, extendedCode);
    // Then
    expect(result).toBe(`${baseCode}\n${extendedCode}`);
    expect(babylon.parse).toHaveBeenCalledTimes(2);
    expect(babylon.parse).toHaveBeenNthCalledWith(1, baseCode, { sourceType: 'module' });
    expect(babylon.parse).toHaveBeenNthCalledWith(2, extendedCode, {
      sourceType: 'module',
    });
    expect(babelTraverse.default).toHaveBeenCalledTimes(2);
    expect(babelTraverse.default).toHaveBeenNthCalledWith(1, baseAST, {
      enter: expect.any(Function),
    });
    expect(babelTraverse.default).toHaveBeenNthCalledWith(2, extendedAST, {
      enter: expect.any(Function),
    });
    expect(babelGenerator).toHaveBeenCalledTimes(2);
    expect(babelGenerator).toHaveBeenNthCalledWith(1, baseAST, {}, baseCode);
    expect(babelGenerator).toHaveBeenNthCalledWith(2, extendedAST, {}, extendedCode);
  });

  it('should merge two JS blocks and move import statements to the top', () => {
    // Given
    const baseCode = 'base-code';
    const baseAST = 'base-ast';
    const baseImportNode = {
      parent: 'base-import-node-parent',
      node: 'base-import-node',
      remove: jest.fn(),
      insertBefore: jest.fn((node) => node),
    };
    const baseTextNode = {
      parent: 'base-text-node-parent',
      node: 'base-text-node',
      insertBefore: jest.fn((node) => node),
    };
    const baseNodes = [baseImportNode, baseTextNode];
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isImportDeclaration.mockImplementationOnce(() => true);
    babelTypes.isImportDeclaration.mockImplementationOnce(() => false);
    babylon.parse.mockImplementationOnce(() => baseAST);
    babelTraverse.default.mockImplementationOnce((_, fns) => {
      baseNodes.forEach((baseNode) => {
        fns.enter(baseNode);
      });
    });
    babelGenerator.mockImplementationOnce(() => ({ code: baseCode }));
    const extendedAST = 'extended-ast';
    const extendedCode = 'extended-code';
    const extendedImportNode = {
      parent: 'extended-import-node-parent',
      node: 'extended-import-node',
      remove: jest.fn(),
      insertBefore: jest.fn((node) => node),
    };
    const extendedNodes = [extendedImportNode];
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isImportDeclaration.mockImplementationOnce(() => true);
    babylon.parse.mockImplementationOnce(() => extendedAST);
    babelTraverse.default.mockImplementationOnce((_, fns) => {
      extendedNodes.forEach((extendedNode) => {
        fns.enter(extendedNode);
      });
    });
    babelGenerator.mockImplementationOnce(() => ({ code: extendedCode }));
    const allNodes = [...baseNodes, ...extendedNodes];
    let sut = null;
    let result = null;
    // When
    sut = new JSMerger();
    result = sut.mergeCode(baseCode, extendedCode);
    // Then
    expect(result).toBe(`${baseCode}\n${extendedCode}`);
    expect(babelTypes.isImportDeclaration).toHaveBeenCalledTimes(allNodes.length);
    expect(babelTypes.isProgram).toHaveBeenCalledTimes(allNodes.length);
    allNodes.forEach((node) => {
      expect(babelTypes.isImportDeclaration).toHaveBeenCalledWith(node);
      expect(babelTypes.isProgram).toHaveBeenCalledWith(node.parent);
    });
    expect(baseTextNode.insertBefore).toHaveBeenCalledTimes(1);
    expect(baseTextNode.insertBefore).toHaveBeenCalledWith(extendedImportNode.node);
    expect(extendedImportNode.remove).toHaveBeenCalledTimes(1);
  });

  it('should merge two JS blocks and remove duplicated bindings', () => {
    // Given
    const baseCode = 'base-code';
    const baseAST = 'base-ast';
    const baseBindingName = 'base-binding';
    const baseBindingParentPath = {
      node: {
        declaration: {
          declarations: [
            {
              id: {
                name: baseBindingName,
              },
            },
          ],
        },
      },
    };
    const baseBinding = {
      parent: 'base-binding-node-parent',
      parentPath: baseBindingParentPath,
    };
    const baseBindingToOverwriteName = 'base-binding-to-overwrite';
    const baseBindingToOverwriteParentPath = {
      node: {
        declaration: {
          declarations: [
            {
              id: {
                name: baseBindingToOverwriteName,
              },
            },
          ],
        },
      },
      remove: jest.fn(),
      insertAfter: jest.fn(),
    };
    const baseBindingToOverwrite = {
      parent: 'base-binding-to-overwrite-node-parent',
      parentPath: baseBindingToOverwriteParentPath,
    };
    const baseNodes = [baseBinding, baseBindingToOverwrite];
    babelTypes.isVariableDeclaration.mockImplementationOnce(() => true);
    babelTypes.isVariableDeclaration.mockImplementationOnce(() => true);
    babelTypes.isExportNamedDeclaration.mockImplementationOnce(() => true);
    babelTypes.isExportNamedDeclaration.mockImplementationOnce(() => true);
    babylon.parse.mockImplementationOnce(() => baseAST);
    babelTraverse.default.mockImplementationOnce((_, fns) => {
      baseNodes.forEach((baseNode) => {
        fns.enter(baseNode);
      });
    });
    babelGenerator.mockImplementationOnce(() => ({ code: baseCode }));
    const extendedAST = 'extended-ast';
    const extendedCode = 'extended-code';
    const extendedBindingName = 'extended-binding';
    const extendedBindingParentPath = {
      node: {
        declaration: {
          declarations: [
            {
              id: {
                name: extendedBindingName,
              },
            },
          ],
        },
      },
    };
    const extendedBinding = {
      parent: 'extended-binding-node-parent',
      parentPath: extendedBindingParentPath,
    };
    const extendedBindingThatOverwritesParentPath = {
      node: {
        declaration: {
          declarations: [
            {
              id: {
                name: baseBindingToOverwriteName,
              },
            },
          ],
        },
      },
      remove: jest.fn(),
    };
    const extendedBindingThatOverwrites = {
      parent: 'extended-binding-that-overwrites-node-parent',
      parentPath: extendedBindingThatOverwritesParentPath,
    };
    const extendedNodes = [extendedBinding, extendedBindingThatOverwrites];
    babelTypes.isVariableDeclaration.mockImplementationOnce(() => true);
    babelTypes.isVariableDeclaration.mockImplementationOnce(() => true);
    babelTypes.isExportNamedDeclaration.mockImplementationOnce(() => true);
    babelTypes.isExportNamedDeclaration.mockImplementationOnce(() => true);
    babylon.parse.mockImplementationOnce(() => extendedAST);
    babelTraverse.default.mockImplementationOnce((_, fns) => {
      extendedNodes.forEach((extendedNode) => {
        fns.enter(extendedNode);
      });
    });
    babelGenerator.mockImplementationOnce(() => ({ code: extendedCode }));
    const allNodes = [...baseNodes, ...extendedNodes];
    let sut = null;
    let result = null;
    // When
    sut = new JSMerger();
    result = sut.mergeCode(baseCode, extendedCode);
    // Then
    expect(result).toBe(`${baseCode}\n${extendedCode}`);
    expect(babelTypes.isVariableDeclaration).toHaveBeenCalledTimes(allNodes.length);
    expect(babelTypes.isExportNamedDeclaration).toHaveBeenCalledTimes(allNodes.length);
    allNodes.forEach((node) => {
      expect(babelTypes.isVariableDeclaration).toHaveBeenCalledWith(node);
      expect(babelTypes.isExportNamedDeclaration).toHaveBeenCalledWith(node.parent);
    });
    expect(extendedBindingThatOverwritesParentPath.remove).toHaveBeenCalledTimes(1);
    expect(baseBindingToOverwriteParentPath.insertAfter).toHaveBeenCalledTimes(1);
    expect(baseBindingToOverwriteParentPath.insertAfter).toHaveBeenCalledWith(
      extendedBindingThatOverwritesParentPath.node,
    );
    expect(baseBindingToOverwriteParentPath.remove).toHaveBeenCalledTimes(1);
  });

  it('should merge two JS blocks and remove duplicated variables', () => {
    // Given
    const baseCode = 'base-code';
    const baseAST = 'base-ast';
    const baseVarName = 'base-var';
    const baseVar = {
      parent: 'base-var-node-parent',
      node: {
        declarations: [
          {
            id: {
              name: baseVarName,
            },
          },
        ],
      },
    };
    const baseVarToOverwriteName = 'base-var-to-overwrite';
    const baseVarToOverwrite = {
      parent: 'base-var-to-overwrite-node-parent',
      node: {
        declarations: [
          {
            id: {
              name: baseVarToOverwriteName,
            },
          },
        ],
      },
      remove: jest.fn(),
      insertAfter: jest.fn(),
    };
    const baseVarToIgnore = {
      parent: 'base-var-to-ignore-node-parent',
    };
    const baseNodes = [baseVar, baseVarToOverwrite, baseVarToIgnore];
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isProgram.mockImplementationOnce(() => false);
    babelTypes.isVariableDeclaration.mockImplementationOnce(() => true);
    babelTypes.isVariableDeclaration.mockImplementationOnce(() => true);
    babelTypes.isVariableDeclaration.mockImplementationOnce(() => true);
    babylon.parse.mockImplementationOnce(() => baseAST);
    babelTraverse.default.mockImplementationOnce((_, fns) => {
      baseNodes.forEach((baseNode) => {
        fns.enter(baseNode);
      });
    });
    babelGenerator.mockImplementationOnce(() => ({ code: baseCode }));
    const extendedAST = 'extended-ast';
    const extendedCode = 'extended-code';
    const extendedVarName = 'extended-var';
    const extendedVar = {
      parent: 'extended-var-node-parent',
      node: {
        declarations: [
          {
            id: {
              name: extendedVarName,
            },
          },
        ],
      },
    };
    const extendedVarThatOverwrites = {
      parent: 'extended-var-that-overwrites-node-parent',
      node: {
        declarations: [
          {
            id: {
              name: baseVarToOverwriteName,
            },
          },
        ],
      },
      remove: jest.fn(),
    };
    const extendedNodes = [extendedVar, extendedVarThatOverwrites];
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isVariableDeclaration.mockImplementationOnce(() => true);
    babelTypes.isVariableDeclaration.mockImplementationOnce(() => true);
    babylon.parse.mockImplementationOnce(() => extendedAST);
    babelTraverse.default.mockImplementationOnce((_, fns) => {
      extendedNodes.forEach((extendedNode) => {
        fns.enter(extendedNode);
      });
    });
    babelGenerator.mockImplementationOnce(() => ({ code: extendedCode }));
    const allNodes = [...baseNodes, ...extendedNodes];
    let sut = null;
    let result = null;
    // When
    sut = new JSMerger();
    result = sut.mergeCode(baseCode, extendedCode);
    // Then
    expect(result).toBe(`${baseCode}\n${extendedCode}`);
    expect(babelTypes.isProgram).toHaveBeenCalledTimes(allNodes.length);
    expect(babelTypes.isVariableDeclaration).toHaveBeenCalledTimes(allNodes.length);
    allNodes.forEach((node) => {
      expect(babelTypes.isProgram).toHaveBeenCalledWith(node.parent);
      expect(babelTypes.isVariableDeclaration).toHaveBeenCalledWith(node);
    });
    expect(babelTypes.isExportNamedDeclaration).toHaveBeenCalledTimes(1);
    expect(babelTypes.isExportNamedDeclaration).toHaveBeenCalledWith(
      baseVarToIgnore.parent,
    );
    expect(extendedVarThatOverwrites.remove).toHaveBeenCalledTimes(1);
    expect(baseVarToOverwrite.insertAfter).toHaveBeenCalledTimes(1);
    expect(baseVarToOverwrite.insertAfter).toHaveBeenCalledWith(
      extendedVarThatOverwrites.node,
    );
    expect(baseVarToOverwrite.remove).toHaveBeenCalledTimes(1);
  });

  it('should merge two JS blocks and remove duplicated functions', () => {
    // Given
    const baseCode = 'base-code';
    const baseAST = 'base-ast';
    const baseFuncName = 'base-func';
    const baseFunc = {
      parent: 'base-func-node-parent',
      node: {
        id: {
          name: baseFuncName,
        },
      },
    };
    const baseFuncToOverwriteName = 'base-func-to-overwrite';
    const baseFuncToOverwrite = {
      parent: 'base-func-to-overwrite-node-parent',
      node: {
        id: {
          name: baseFuncToOverwriteName,
        },
      },
      remove: jest.fn(),
      insertAfter: jest.fn(),
    };
    const baseFuncToIgnore = {
      parent: 'base-func-to-ignore-node-parent',
    };
    const baseNodes = [baseFunc, baseFuncToOverwrite, baseFuncToIgnore];
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isProgram.mockImplementationOnce(() => false);
    babelTypes.isFunctionDeclaration.mockImplementationOnce(() => true);
    babelTypes.isFunctionDeclaration.mockImplementationOnce(() => true);
    babelTypes.isFunctionDeclaration.mockImplementationOnce(() => true);
    babylon.parse.mockImplementationOnce(() => baseAST);
    babelTraverse.default.mockImplementationOnce((_, fns) => {
      baseNodes.forEach((baseNode) => {
        fns.enter(baseNode);
      });
    });
    babelGenerator.mockImplementationOnce(() => ({ code: baseCode }));
    const extendedAST = 'extended-ast';
    const extendedCode = 'extended-code';
    const extendedFuncName = 'extended-func';
    const extendedFunc = {
      parent: 'extended-func-node-parent',
      node: {
        id: {
          name: extendedFuncName,
        },
      },
    };
    const extendedFuncThatOverwrites = {
      parent: 'extended-func-that-overwrites-node-parent',
      node: {
        id: {
          name: baseFuncToOverwriteName,
        },
      },
      remove: jest.fn(),
    };
    const extendedNodes = [extendedFunc, extendedFuncThatOverwrites];
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isProgram.mockImplementationOnce(() => true);
    babelTypes.isFunctionDeclaration.mockImplementationOnce(() => true);
    babelTypes.isFunctionDeclaration.mockImplementationOnce(() => true);
    babylon.parse.mockImplementationOnce(() => extendedAST);
    babelTraverse.default.mockImplementationOnce((_, fns) => {
      extendedNodes.forEach((extendedNode) => {
        fns.enter(extendedNode);
      });
    });
    babelGenerator.mockImplementationOnce(() => ({ code: extendedCode }));
    const allNodes = [...baseNodes, ...extendedNodes];
    let sut = null;
    let result = null;
    // When
    sut = new JSMerger();
    result = sut.mergeCode(baseCode, extendedCode);
    // Then
    expect(result).toBe(`${baseCode}\n${extendedCode}`);
    expect(babelTypes.isProgram).toHaveBeenCalledTimes(allNodes.length);
    expect(babelTypes.isFunctionDeclaration).toHaveBeenCalledTimes(allNodes.length);
    allNodes.forEach((node) => {
      expect(babelTypes.isProgram).toHaveBeenCalledWith(node.parent);
      expect(babelTypes.isFunctionDeclaration).toHaveBeenCalledWith(node);
    });
    expect(extendedFuncThatOverwrites.remove).toHaveBeenCalledTimes(1);
    expect(baseFuncToOverwrite.insertAfter).toHaveBeenCalledTimes(1);
    expect(baseFuncToOverwrite.insertAfter).toHaveBeenCalledWith(
      extendedFuncThatOverwrites.node,
    );
    expect(baseFuncToOverwrite.remove).toHaveBeenCalledTimes(1);
  });

  it('should have a provider for the DI container', () => {
    // Given
    const app = {
      set: jest.fn(),
    };
    let sut = null;
    let serviceFn = null;
    // When
    jsMerger(app);
    [[, serviceFn]] = app.set.mock.calls;
    sut = serviceFn();
    // Then
    expect(sut).toBeInstanceOf(JSMerger);
    expect(app.set).toHaveBeenCalledTimes(1);
    expect(app.set).toHaveBeenCalledWith('jsMerger', expect.any(Function));
  });
});
