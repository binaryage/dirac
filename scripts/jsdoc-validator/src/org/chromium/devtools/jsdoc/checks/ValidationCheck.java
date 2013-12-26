package org.chromium.devtools.jsdoc.checks;

import org.chromium.devtools.jsdoc.DoDidNodeVisitor;
import org.chromium.devtools.jsdoc.ValidatorContext;

/**
 * A base class for all JSDoc validation checks.
 */
public abstract class ValidationCheck implements DoDidNodeVisitor {

    private ValidatorContext context;

    public void didTraverseTree() { }

    protected ValidatorContext getContext() {
        return context;
    }

    public void setContext(ValidatorContext context) {
        if (this.context != null) {
            throw new RuntimeException("ValidatorContext already set");
        }
        this.context = context;
    }
}
