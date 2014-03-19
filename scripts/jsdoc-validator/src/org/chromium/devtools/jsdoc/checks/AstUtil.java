package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.Assignment;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.Comment;
import com.google.javascript.rhino.head.ast.FunctionNode;
import com.google.javascript.rhino.head.ast.ObjectProperty;

import org.chromium.devtools.jsdoc.ValidatorContext;

public class AstUtil {

    private static final String PROTOTYPE_SUFFIX = ".prototype";

    static boolean hasParentOfType(AstNode node, int tokenType) {
        AstNode parent = node.getParent();
        if (parent == null) {
            return false;
        }
        return parent.getType() == tokenType;
    }

    static AstNode getFunctionNameNode(FunctionNode functionNode) {
        AstNode nameNode = functionNode.getFunctionName();
        if (nameNode != null) {
            return nameNode;
        }

        if (AstUtil.hasParentOfType(functionNode, Token.COLON)) {
            return ((ObjectProperty) functionNode.getParent()).getLeft();
        }

        if (AstUtil.hasParentOfType(functionNode, Token.ASSIGN)) {
            Assignment assignment = (Assignment) functionNode.getParent();
            if (assignment.getRight() == functionNode) {
                return assignment.getLeft();
            }
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
        if (hasParentOfType(functionNode, Token.ASSIGN)) {
            Assignment assignment = (Assignment) functionNode.getParent();
            if (assignment.getRight() == functionNode) {
                jsDocNode = assignment.getJsDocNode();
                if (jsDocNode != null) {
                    return jsDocNode;
                }
            }
        }

        if (hasParentOfType(functionNode, Token.COLON)) {
            jsDocNode = ((ObjectProperty) functionNode.getParent()).getLeft().getJsDocNode();
            if (jsDocNode != null) {
                return jsDocNode;
            }
        }
        return null;
    }

    private AstUtil() {}
}
