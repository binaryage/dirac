package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.ast.AstNode;

import org.chromium.devtools.jsdoc.ValidatorContext;

abstract class ContextTrackingChecker {
    private ContextTrackingState state;

    abstract void enterNode(AstNode node);

    abstract void leaveNode(AstNode node);

    void setState(ContextTrackingState state) {
        this.state = state;
    }

    protected ContextTrackingState getState() {
        return state;
    }

    protected ValidatorContext getContext() {
        return state.getContext();
    }

    void reportErrorAtNodeStart(AstNode node, String errorText) {
        getContext().reportErrorInNode(node, 0, errorText);
    }
}
