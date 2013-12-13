package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.ast.AstNode;

public class AstUtil {

    static boolean hasParentOfType(AstNode node, int tokenType) {
        AstNode parent = node.getParent();
        if (parent == null) {
            return false;
        }
        return parent.getType() == tokenType;
    }

    private AstUtil() {}
}
