package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.Assignment;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.Comment;
import com.google.javascript.rhino.head.ast.FunctionNode;
import com.google.javascript.rhino.head.ast.ObjectProperty;
import com.google.javascript.rhino.head.ast.ReturnStatement;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

public final class RequiredReturnAnnotationCheck extends ValidationCheck {

    private final Deque<FunctionNode> functionStack = new ArrayDeque<>(16);
    private final Map<FunctionNode, Boolean> returningFunctions = new HashMap<>();

    @Override
    public void doVisit(AstNode node) {
        switch (node.getType()) {
        case Token.RETURN:
            if (((ReturnStatement) node).getReturnValue() != null &&
                    !AstUtil.hasParentOfType(node, Token.ASSIGN)) {
                FunctionNode topFunctionNode = functionStack.peekFirst();
                if (topFunctionNode == null) {
                    return;
                }
                AstNode nameNode = getFunctionNameNode(topFunctionNode);
                if (nameNode == null) {
                    return;
                }
                String name = getContext().getNodeText(nameNode);
                boolean isApiFunction = functionStack.size() == 1 && !name.startsWith("_");
                returningFunctions.put(topFunctionNode, isApiFunction);
            }
            break;
        case Token.FUNCTION:
            functionStack.push((FunctionNode) node);
            break;
        }
    }

    @Override
    public void didVisit(AstNode node) {
        if (node.getType() != Token.FUNCTION) {
            return;
        }

        FunctionNode functionNode = functionStack.remove();
        checkFunctionAnnotation(functionNode);
        returningFunctions.remove(functionNode);
    }

    @SuppressWarnings("unused")
    private void checkFunctionAnnotation(FunctionNode functionNode) {
        Boolean returnsValueBoolean = returningFunctions.get(functionNode);
        boolean isReturningFunction = returnsValueBoolean != null;
        boolean isApiFunction = isReturningFunction && returnsValueBoolean.booleanValue();
        Comment jsDocNode = getJsDocNode(functionNode);
        String jsDoc = jsDocNode != null ? jsDocNode.getValue() : null;

        int invalidAnnotationIndex = invalidReturnsAnnotationIndex(jsDoc);
        if (invalidAnnotationIndex != -1) {
            // FIXME: Report that no @return should be present for non-returning functions,
            // once @interface methods with @return are handled correctly.
            String suggestedResolution = "should be @return instead";
            getContext().reportErrorInNode(jsDocNode, invalidAnnotationIndex,
                    String.format("invalid @returns annotation found - %s", suggestedResolution));
            return;
        }
        AstNode functionNameNode = getFunctionNameNode(functionNode);
        if (functionNameNode == null) {
            return;
        }

        if (isReturningFunction) {
            if (!hasReturnAnnotation(jsDoc) && isApiFunction) {
                getContext().reportErrorInNode(functionNameNode, 0,
                        "@return annotation is required for API functions that return value");
            }
        } else {
            // FIXME: Enable this once @interface methods with @return are handled correctly.
            if (false && hasReturnAnnotation(jsDoc)) {
                getContext().reportErrorInNode(functionNameNode, 0,
                        "@return annotation found, yet function does not return value");
            }
        }
    }

    private static boolean hasReturnAnnotation(String jsDoc) {
        return jsDoc != null && jsDoc.contains("@return");
    }

    private static int invalidReturnsAnnotationIndex(String jsDoc) {
        return jsDoc == null ? -1 : jsDoc.indexOf("@returns");
    }

    private static AstNode getFunctionNameNode(FunctionNode functionNode) {
        AstNode nameNode = functionNode.getFunctionName();
        if (nameNode != null) {
            return nameNode;
        }

        if (AstUtil.hasParentOfType(functionNode, Token.COLON)) {
            return ((ObjectProperty) functionNode.getParent()).getLeft();
        }
        // Do not require annotation for assignment-RHS functions.
        return null;
    }

    private static Comment getJsDocNode(FunctionNode functionNode) {
        Comment jsDocNode = functionNode.getJsDocNode();
        if (jsDocNode != null) {
            return jsDocNode;
        }

        // reader.onloadend = function() {...}
        if (AstUtil.hasParentOfType(functionNode, Token.ASSIGN)) {
            Assignment assignment = (Assignment) functionNode.getParent();
            if (assignment.getRight() == functionNode) {
                jsDocNode = assignment.getJsDocNode();
                if (jsDocNode != null) {
                    return jsDocNode;
                }
            }
        }

        if (AstUtil.hasParentOfType(functionNode, Token.COLON)) {
            jsDocNode = ((ObjectProperty) functionNode.getParent()).getLeft().getJsDocNode();
            if (jsDocNode != null) {
                return jsDocNode;
            }
        }
        return null;
    }
}
