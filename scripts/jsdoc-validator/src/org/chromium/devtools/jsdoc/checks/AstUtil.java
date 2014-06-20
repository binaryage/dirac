package org.chromium.devtools.jsdoc.checks;

import com.google.common.base.Preconditions;
import com.google.javascript.rhino.JSTypeExpression;
import com.google.javascript.rhino.Node;
import com.google.javascript.rhino.Token;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AstUtil {

    private static final String PROTOTYPE_SUFFIX = ".prototype";

    static Node parentOfType(Node node, int tokenType) {
        Node parent = node.getParent();
        return (parent == null || parent.getType() != tokenType) ? null : parent;
    }

    /**
     * Based on NodeUtil#getFunctionNameNode(Node).
     */
    static Node getFunctionNameNode(Node node) {
        Preconditions.checkState(node.isFunction());
        Node funNameNode = node.getFirstChild();
        // Don't return the name node for anonymous functions
        if (!funNameNode.getString().isEmpty()) {
            return funNameNode;
        }

        Node parent = node.getParent();
        if (parent != null) {
            switch (parent.getType()) {
            case Token.NAME:
                // var name = function() ...
                // var name2 = function name1() ...
                return parent;
            // FIXME: Perhaps, the setter and getter cases should be handled, too,
            // but this breaks tests.
            // case Token.SETTER_DEF:
            // case Token.GETTER_DEF:
            case Token.STRING_KEY:
                return parent;
            case Token.NUMBER:
                return parent;
            case Token.ASSIGN:
                if (parent.getLastChild() == node &&
                        parent.getFirstChild().getType() == Token.NAME) {
                    return parent.getFirstChild();
                }
                return null;
            case Token.VAR:
                return parent.getFirstChild();
            default:
                return null;
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

    static Node getAssignedTypeNameNode(Node assignment) {
        Preconditions.checkState(assignment.isAssign() || assignment.isVar());
        Node typeNameNode = assignment.getFirstChild();
        if (typeNameNode.getType() != Token.GETPROP && typeNameNode.getType() != Token.NAME) {
            return null;
        }
        return typeNameNode;
    }

    static List<Node> getArguments(Node functionCall) {
        int childCount = functionCall.getChildCount();
        if (childCount == 1) {
            return Collections.emptyList();
        }
        List<Node> arguments = new ArrayList<>(childCount - 1);
        for (int i = 1; i < childCount; ++i) {
            arguments.add(functionCall.getChildAtIndex(i));
        }
        return arguments;
    }

    static String getAnnotationTypeString(JSTypeExpression expression) {
        return expression.getRoot().getFirstChild().getString();
    }

    private AstUtil() {}
}
