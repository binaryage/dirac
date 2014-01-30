package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.Comment;
import com.google.javascript.rhino.head.ast.FunctionNode;

import java.util.HashSet;
import java.util.Set;

public final class RequiredThisAnnotationChecker extends ContextTrackingChecker {

    private final Set<FunctionRecord> functionsRequiringThisAnnotation = new HashSet<>();

    @Override
    void enterNode(AstNode node) {
        if (node.getType() == Token.THIS) {
            FunctionRecord function = getState().getCurrentFunctionRecord();
            if (function == null) {
                return;
            }
            if (!function.isTopLevelFunction() && !function.isConstructor) {
                functionsRequiringThisAnnotation.add(function);
            }
            return;
        }
    }

    @Override
    void leaveNode(AstNode node) {
        if (node.getType() != Token.FUNCTION) {
            return;
        }

        ContextTrackingState state = getState();
        FunctionRecord record = state.getCurrentFunctionRecord();
        if (!functionsRequiringThisAnnotation.contains(record)) {
            return;
        }
        FunctionNode functionNode = (FunctionNode) node;
        AstNode functionNameNode = AstUtil.getFunctionNameNode(functionNode);
        if (functionNameNode != null && shouldAddThisAnnotation(functionNode)) {
            state.getContext().reportErrorInNode(functionNameNode, 0,
                    "@this annotation is required for functions referencing 'this'");
        }
    }

    private boolean shouldAddThisAnnotation(FunctionNode node) {
        Comment comment = AstUtil.getJsDocNode(node);
        return comment == null || !getContext().getNodeText(comment).contains("@this");
    }
}
