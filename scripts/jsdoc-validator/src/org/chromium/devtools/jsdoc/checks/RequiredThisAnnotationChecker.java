package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.AstNode;
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
        FunctionRecord function = state.getCurrentFunctionRecord();
        FunctionNode functionNode = (FunctionNode) node;
        if (!functionsRequiringThisAnnotation.contains(function)) {
            AstNode functionNameNode = AstUtil.getFunctionNameNode(functionNode);
            if (functionNameNode != null && !function.isTopLevelFunction() &&
                    AstUtil.hasThisAnnotation(functionNode, getContext())) {
                reportErrorAtNodeStart(
                        functionNameNode,
                        "@this annotation found for function not referencing 'this'");
            }
            return;
        }
        AstNode functionNameNode = AstUtil.getFunctionNameNode(functionNode);
        if (functionNameNode != null && !AstUtil.hasThisAnnotation(functionNode, getContext())) {
            reportErrorAtNodeStart(
                    functionNameNode,
                    "@this annotation is required for functions referencing 'this'");
        }
    }
}
