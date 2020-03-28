// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import * as ts from 'typescript';

import {valueForTypeNode} from '../../../../scripts/component_bridges/value_for_type_node';

const createNode = (type: ts.SyntaxKind): ts.TypeNode => {
  const node = ts.createNode(type);
  // not sure what this field is used for or why it exists
  // but we need it to satisfy the compiler
  (node as ts.TypeNode)._typeNodeBrand = '...';
  return node as ts.TypeNode;
};

describe('valueForTypeNode', () => {
  it('throws for any node it cannot process', () => {
    const objectNode = createNode(ts.SyntaxKind.ObjectKeyword);
    assert.throws(() => {
      valueForTypeNode(objectNode);
    }, `Unsupported node kind: ${ts.SyntaxKind[ts.SyntaxKind.ObjectKeyword]}`);
  });

  it('supports primitive types', () => {
    const stringNode = createNode(ts.SyntaxKind.StringKeyword);
    const numberNode = createNode(ts.SyntaxKind.NumberKeyword);
    const booleanNode = createNode(ts.SyntaxKind.BooleanKeyword);

    const voidNode = createNode(ts.SyntaxKind.VoidKeyword);
    assert.equal(valueForTypeNode(stringNode), 'string');
    assert.equal(valueForTypeNode(numberNode), 'number');
    assert.equal(valueForTypeNode(booleanNode), 'boolean');
    assert.equal(valueForTypeNode(voidNode), 'void');
  });

  it('converts union types', () => {
    const stringNode = createNode(ts.SyntaxKind.StringKeyword);
    const numberNode = createNode(ts.SyntaxKind.NumberKeyword);

    const unionNode = ts.createUnionTypeNode([stringNode, numberNode]);
    assert.equal(valueForTypeNode(unionNode), 'string|number');
  });

  describe('optional types from TS => Closure', () => {
    it('converts unions with a primitive and null into ?', () => {
      const stringNode = createNode(ts.SyntaxKind.StringKeyword);
      const nullNode = createNode(ts.SyntaxKind.NullKeyword);

      const unionNode = ts.createUnionTypeNode([stringNode, nullNode]);
      assert.equal(valueForTypeNode(unionNode), '?string');
    });

    it('converts null unions with an interface into !X | null', () => {
      const interfaceNode = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
      const nullNode = createNode(ts.SyntaxKind.NullKeyword);

      const unionNode = ts.createUnionTypeNode([interfaceNode, nullNode]);
      assert.equal(valueForTypeNode(unionNode), '!ExampleInterface|null');
    });

    it('converts null unions into ?X if they are a func param', () => {
      const interfaceNode = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
      const nullNode = createNode(ts.SyntaxKind.NullKeyword);

      const unionNode = ts.createUnionTypeNode([interfaceNode, nullNode]);
      assert.equal(valueForTypeNode(unionNode, true), '?ExampleInterface');
    });
  });

  it('converts any and unknown into *', () => {
    const anyNode = createNode(ts.SyntaxKind.AnyKeyword);
    const unknownNode = createNode(ts.SyntaxKind.UnknownKeyword);

    assert.equal(valueForTypeNode(unknownNode), '*');
    assert.equal(valueForTypeNode(anyNode), '*');
  });

  it('uses the name for a typereference', () => {
    const node = ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []);
    assert.equal(valueForTypeNode(node), 'ExampleInterface');
  });

  describe('converting arrays', () => {
    it('converts primitive types without the non-null !', () => {
      const node = ts.createArrayTypeNode(createNode(ts.SyntaxKind.StringKeyword));

      assert.equal(valueForTypeNode(node), 'Array.<string>');
    });

    it('converts complex types with the non null !', () => {
      const node = ts.createArrayTypeNode(ts.createTypeReferenceNode(ts.createIdentifier('ExampleInterface'), []));

      assert.equal(valueForTypeNode(node), 'Array.<!ExampleInterface>');
    });
  });

  describe('converting functions', () => {
    it('converts functions with no parameters', () => {
      const returnTypeNode = createNode(ts.SyntaxKind.StringKeyword);
      const node = ts.createFunctionTypeNode([], [], returnTypeNode);
      assert.equal(valueForTypeNode(node), 'function(): string');
    });

    it('converts a function with parameters', () => {
      const returnTypeNode = createNode(ts.SyntaxKind.StringKeyword);
      const stringParam = ts.createParameter(
          [], [], undefined, ts.createIdentifier('foo'), undefined, createNode(ts.SyntaxKind.StringKeyword));
      const node = ts.createFunctionTypeNode([], [stringParam], returnTypeNode);

      assert.equal(valueForTypeNode(node), 'function(string): string');
    });
  });
});
