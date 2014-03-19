package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.Comment;
import com.google.javascript.rhino.head.ast.FunctionNode;

import org.chromium.devtools.jsdoc.ValidatorContext;

import java.util.regex.Pattern;

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

    protected boolean hasAnnotationTag(FunctionNode node, String tagName) {
        Comment comment = AstUtil.getJsDocNode(node);
        return comment != null &&
                Pattern.matches("(?s).*@" + tagName + "\\b.*", getContext().getNodeText(comment));
    }

    protected void reportErrorAtNodeStart(AstNode node, String errorText) {
        getContext().reportErrorInNode(node, 0, errorText);
    }
}
