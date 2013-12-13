package org.chromium.devtools.jsdoc;

import com.google.javascript.rhino.head.ast.AstNode;

public interface DoDidNodeVisitor {
    /**
     * Pre-visit node. Visitable children (if any) of {@code node} will be visited afterwards.
     * @param node
     */
    void doVisit(AstNode node);

    /**
     * Post-visit node. The method is invoked once all visitable children (if any) of {@code node}
     * have been visited.
     * @param node
     */
    void didVisit(AstNode node);
}
