package org.chromium.devtools.jsdoc;

import com.google.javascript.rhino.head.ast.AstNode;

/**
 * A base class for all JSDoc validation checks.
 */
public abstract class ValidationCheck implements DoDidNodeVisitor {

    private ValidatorContext context;

    protected String getNodeText(AstNode node) {
        return context.getNodeText(node);
    }

    protected void setContext(ValidatorContext context) {
        if (this.context != null) {
            throw new RuntimeException("ValidatorContext already set");
        }
        this.context = context;
    }
}
