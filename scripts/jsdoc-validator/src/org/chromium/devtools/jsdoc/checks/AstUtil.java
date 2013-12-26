package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.Assignment;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.FunctionNode;

public class AstUtil {

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

        if (AstUtil.hasParentOfType(functionNode, Token.ASSIGN)) {
            Assignment assignment = (Assignment) functionNode.getParent();
            if (assignment.getRight() == functionNode) {
                return assignment.getLeft();
            }
        }
        return null;
    }

    private AstUtil() {}
}
