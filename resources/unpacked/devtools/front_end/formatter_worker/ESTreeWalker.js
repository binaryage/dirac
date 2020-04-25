// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

/** @type {!Object} */
const SkipSubTreeObject = {};

/**
 * @unrestricted
 */
export class ESTreeWalker {
  /**
   * @param {function(!ESTree.Node):(!Object|undefined)} beforeVisit
   * @param {function(!ESTree.Node)=} afterVisit
   */
  constructor(beforeVisit, afterVisit) {
    this._beforeVisit = beforeVisit;
    this._afterVisit = afterVisit || new Function();
    this._walkNulls = false;
  }

  /**
   * @return {!Object}
   */
  static get SkipSubtree() {
    return SkipSubTreeObject;
  }

  /**
   * @param {boolean} value
   */
  setWalkNulls(value) {
    this._walkNulls = value;
  }

  /**
   * @param {!ESTree.Node} ast
   */
  walk(ast) {
    this._innerWalk(ast, null);
  }

  /**
   * @param {!ESTree.Node} node
   * @param {?ESTree.Node} parent
   */
  _innerWalk(node, parent) {
    if (!node && parent && this._walkNulls) {
      const result = /** @type {!Object} */ ({raw: 'null', value: null});
      result.type = 'Literal';
      node = /** @type {!ESTree.Node} */ (result);
    }

    if (!node) {
      return;
    }
    node.parent = parent;

    if (this._beforeVisit.call(null, node) === ESTreeWalker.SkipSubtree) {
      this._afterVisit.call(null, node);
      return;
    }

    const walkOrder = _walkOrder[node.type];
    if (!walkOrder) {
      console.error('Walk order not defined for ' + node.type);
      return;
    }

    if (node.type === 'TemplateLiteral') {
      const templateLiteral = /** @type {!ESTree.TemplateLiteralNode} */ (node);
      const expressionsLength = templateLiteral.expressions.length;
      for (let i = 0; i < expressionsLength; ++i) {
        this._innerWalk(templateLiteral.quasis[i], templateLiteral);
        this._innerWalk(templateLiteral.expressions[i], templateLiteral);
      }
      this._innerWalk(templateLiteral.quasis[expressionsLength], templateLiteral);
    } else {
      for (let i = 0; i < walkOrder.length; ++i) {
        const entity = node[walkOrder[i]];
        if (Array.isArray(entity)) {
          this._walkArray(entity, node);
        } else {
          this._innerWalk(entity, node);
        }
      }
    }

    this._afterVisit.call(null, node);
  }

  /**
   * @param {!Array.<!ESTree.Node>} nodeArray
   * @param {?ESTree.Node} parentNode
   */
  _walkArray(nodeArray, parentNode) {
    for (let i = 0; i < nodeArray.length; ++i) {
      this._innerWalk(nodeArray[i], parentNode);
    }
  }
}

/** @enum {!Array.<string>} */
const _walkOrder = {
  'AwaitExpression': ['argument'],
  'ArrayExpression': ['elements'],
  'ArrayPattern': ['elements'],
  'ArrowFunctionExpression': ['params', 'body'],
  'AssignmentExpression': ['left', 'right'],
  'AssignmentPattern': ['left', 'right'],
  'BinaryExpression': ['left', 'right'],
  'BlockStatement': ['body'],
  'BreakStatement': ['label'],
  'CallExpression': ['callee', 'arguments'],
  'CatchClause': ['param', 'body'],
  'ClassBody': ['body'],
  'ClassDeclaration': ['id', 'superClass', 'body'],
  'ClassExpression': ['id', 'superClass', 'body'],
  'ConditionalExpression': ['test', 'consequent', 'alternate'],
  'ContinueStatement': ['label'],
  'DebuggerStatement': [],
  'DoWhileStatement': ['body', 'test'],
  'EmptyStatement': [],
  'ExpressionStatement': ['expression'],
  'ForInStatement': ['left', 'right', 'body'],
  'ForOfStatement': ['left', 'right', 'body'],
  'ForStatement': ['init', 'test', 'update', 'body'],
  'FunctionDeclaration': ['id', 'params', 'body'],
  'FunctionExpression': ['id', 'params', 'body'],
  'Identifier': [],
  'ImportDeclaration': ['specifiers', 'source'],
  'ImportExpression': ['source'],
  'ExportAllDeclaration': ['source'],
  'ExportDefaultDeclaration': ['declaration'],
  'ExportNamedDeclaration': ['specifiers', 'source', 'declaration'],
  'IfStatement': ['test', 'consequent', 'alternate'],
  'LabeledStatement': ['label', 'body'],
  'Literal': [],
  'LogicalExpression': ['left', 'right'],
  'MemberExpression': ['object', 'property'],
  'MethodDefinition': ['key', 'value'],
  'NewExpression': ['callee', 'arguments'],
  'ObjectExpression': ['properties'],
  'ObjectPattern': ['properties'],
  'ParenthesizedExpression': ['expression'],
  'Program': ['body'],
  'Property': ['key', 'value'],
  'RestElement': ['argument'],
  'ReturnStatement': ['argument'],
  'SequenceExpression': ['expressions'],
  'SpreadElement': ['argument'],
  'Super': [],
  'SwitchCase': ['test', 'consequent'],
  'SwitchStatement': ['discriminant', 'cases'],
  'TaggedTemplateExpression': ['tag', 'quasi'],
  'TemplateElement': [],
  'TemplateLiteral': ['quasis', 'expressions'],
  'ThisExpression': [],
  'ThrowStatement': ['argument'],
  'TryStatement': ['block', 'handler', 'finalizer'],
  'UnaryExpression': ['argument'],
  'UpdateExpression': ['argument'],
  'VariableDeclaration': ['declarations'],
  'VariableDeclarator': ['id', 'init'],
  'WhileStatement': ['test', 'body'],
  'WithStatement': ['object', 'body'],
  'YieldExpression': ['argument']
};
