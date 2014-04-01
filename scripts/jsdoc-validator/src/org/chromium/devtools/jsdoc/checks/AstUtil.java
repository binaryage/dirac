package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.Assignment;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.Comment;
import com.google.javascript.rhino.head.ast.FunctionNode;
import com.google.javascript.rhino.head.ast.ObjectProperty;
import com.google.javascript.rhino.head.ast.VariableInitializer;

public class AstUtil {

    private static final String PROTOTYPE_SUFFIX = ".prototype";

    static AstNode parentOfType(AstNode node, int tokenType) {
        AstNode parent = node.getParent();
        return (parent == null || parent.getType() != tokenType) ? null : parent;
    }

    static AstNode getFunctionNameNode(FunctionNode functionNode) {
        AstNode nameNode = functionNode.getFunctionName();
        if (nameNode != null) {
            return nameNode;
        }

        AstNode parentNode = functionNode.getParent();
        if (parentNode == null) {
            return null;
        }

        switch (parentNode.getType()) {
        case Token.COLON:
            return ((ObjectProperty) parentNode).getLeft();
        case Token.ASSIGN:
            Assignment assignment = (Assignment) parentNode;
            if (assignment.getRight() == functionNode) {
                return assignment.getLeft();
            }
            break;
        case Token.VAR:
            return ((VariableInitializer) parentNode).getTarget();
        }

        return null;
    }

    static String getTypeNameFromPrototype(String value) {
        return value.substring(0, value.length() - PROTOTYPE_SUFFIX.length());
    }

    static boolean isPrototypeName(String typeName) {
        return typeName.endsWith(PROTOTYPE_SUFFIX);
    }

    static AstNode getAssignedTypeNameNode(Assignment assignment) {
        AstNode typeNameNode = assignment.getLeft();
        if (typeNameNode.getType() != Token.GETPROP && typeNameNode.getType() != Token.NAME) {
            return null;
        }
        return typeNameNode;
    }

    static Comment getJsDocNode(AstNode node) {
        if (node.getType() == Token.FUNCTION) {
            return getJsDocNode((FunctionNode) node);
        } else {
            return node.getJsDocNode();
        }
    }

    static Comment getJsDocNode(FunctionNode functionNode) {
        Comment jsDocNode = functionNode.getJsDocNode();
        if (jsDocNode != null) {
            return jsDocNode;
        }

        // reader.onloadend = function() {...}
        AstNode parentNode = functionNode.getParent();
        if (parentNode == null) {
            return null;
        }

        switch (parentNode.getType()) {
        case Token.COLON:
            return ((ObjectProperty) parentNode).getLeft().getJsDocNode();
        case Token.ASSIGN:
            Assignment assignment = (Assignment) parentNode;
            if (assignment.getRight() == functionNode) {
                return assignment.getJsDocNode();
            }
            break;
        case Token.VAR:
            return parentNode.getParent().getJsDocNode();
        }

        return null;
    }

    private AstUtil() {}
}
