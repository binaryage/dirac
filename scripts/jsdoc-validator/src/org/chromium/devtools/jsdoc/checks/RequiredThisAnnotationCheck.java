package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.Assignment;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.FunctionNode;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.Set;

public final class RequiredThisAnnotationCheck extends ValidationCheck {

    private final Deque<AstNode> functionStack = new ArrayDeque<>(16);
    private final Set<AstNode> thisReferencingFunctions = new HashSet<>();

    @Override
    public void doVisit(AstNode node) {
        if (node.getType() == Token.THIS) {
            if (!functionStack.isEmpty()) {
                // Non-global scope.
                thisReferencingFunctions.add(functionStack.peekFirst());
            }
            return;
        }

        if (node.getType() != Token.FUNCTION) {
            return;
        }

        functionStack.push(node);
    }

    @Override
    public void didVisit(AstNode node) {
        if (node.getType() != Token.FUNCTION) {
            return;
        }

        FunctionNode functionNode = (FunctionNode) functionStack.remove();
        if (thisReferencingFunctions.contains(functionNode) && !functionStack.isEmpty()) {
            // If the stack is not empty, then it's a nested function.
            String jsDoc = getJsDoc(functionNode);
            AstNode functionNameNode = AstUtil.getFunctionNameNode(functionNode);
            if (functionNameNode != null && shouldAddThisAnnotation(jsDoc)) {
                getContext().reportErrorInNode(functionNameNode, 0,
                        "@this annotation is required for functions referencing 'this'");
            }
        }
        thisReferencingFunctions.remove(functionNode);
    }

    private boolean shouldAddThisAnnotation(String jsDoc) {
        return jsDoc == null || (!jsDoc.contains("@this") && !jsDoc.contains("@constructor"));
    }

    private String getJsDoc(FunctionNode functionNode) {
        String jsDoc = functionNode.getJsDoc();
        if (jsDoc != null) {
            return jsDoc;
        }

        // reader.onloadend = function() {...}
        if (AstUtil.hasParentOfType(functionNode, Token.ASSIGN)) {
            Assignment assignment = (Assignment) functionNode.getParent();
            if (assignment.getRight() == functionNode) {
                jsDoc = assignment.getJsDoc();
                if (jsDoc != null) {
                    return jsDoc;
                }
            }
        }
        return null;
    }
}
