package org.chromium.devtools.jsdoc;

import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.NodeVisitor;

import java.util.ArrayDeque;
import java.util.Deque;

public abstract class DoDidVisitorAdapter implements DoDidNodeVisitor, NodeVisitor {

    private final Deque<AstNode> nodeStack = new ArrayDeque<>();

    @Override
    public boolean visit(AstNode node) {
        AstNode topNode = nodeStack.peek();
        if (topNode != null && topNode != node.getParent()) {
            do {
                topNode = nodeStack.pop();
                didVisit(topNode);
            } while (topNode.getParent() != node.getParent());
        }
        nodeStack.push(node);
        doVisit(node);
        return true;
    }

    /**
     * This method MUST be called after {@code foo.visit(doDidVisitorAdapter)} has finished.
     */
    public void flush() {
        didVisit(nodeStack.remove());
    }
}
