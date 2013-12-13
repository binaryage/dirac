package org.chromium.devtools.jsdoc.checks;

import org.chromium.devtools.jsdoc.DoDidNodeVisitor;
import org.chromium.devtools.jsdoc.ValidatorContext;

/**
 * A base class for all JSDoc validation checks.
 */
public abstract class ValidationCheck implements DoDidNodeVisitor {

    protected final ValidatorContext context;

    ValidationCheck(ValidatorContext context) {
        this.context = context;
    }
}
