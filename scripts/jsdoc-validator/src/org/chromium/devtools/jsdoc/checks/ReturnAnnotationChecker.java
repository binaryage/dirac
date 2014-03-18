package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.Comment;
import com.google.javascript.rhino.head.ast.FunctionNode;
import com.google.javascript.rhino.head.ast.ObjectProperty;
import com.google.javascript.rhino.head.ast.ReturnStatement;

import java.util.HashSet;
import java.util.Set;

public final class ReturnAnnotationChecker extends ContextTrackingChecker {

    private final Set<FunctionRecord> valueReturningFunctions = new HashSet<>();
    private final Set<FunctionRecord> throwingFunctions = new HashSet<>();

    @Override
    public void enterNode(AstNode node) {
        switch (node.getType()) {
        case Token.RETURN:
            handleReturn((ReturnStatement) node);
            break;
        case Token.THROW:
            handleThrow();
            break;
        default:
            break;
        }
    }

    private void handleReturn(ReturnStatement node) {
        if (node.getReturnValue() == null || AstUtil.hasParentOfType(node, Token.ASSIGN)) {
            return;
        }

        FunctionRecord record = getState().getCurrentFunctionRecord();
        if (record == null) {
            return;
        }
        AstNode nameNode = getFunctionNameNode(record.functionNode);
        if (nameNode == null) {
            return;
        }
        valueReturningFunctions.add(record);
    }

    private void handleThrow() {
        FunctionRecord record = getState().getCurrentFunctionRecord();
        if (record == null) {
            return;
        }
        AstNode nameNode = getFunctionNameNode(record.functionNode);
        if (nameNode == null) {
            return;
        }
        throwingFunctions.add(record);
    }

    @Override
    public void leaveNode(AstNode node) {
        if (node.getType() != Token.FUNCTION) {
            return;
        }

        FunctionRecord record = getState().getCurrentFunctionRecord();
        if (record != null) {
            checkFunctionAnnotation(record);
        }
    }

    @SuppressWarnings("unused")
    private void checkFunctionAnnotation(FunctionRecord function) {
        String functionName = getFunctionName(function.functionNode);
        if (functionName == null) {
            return;
        }
        boolean isApiFunction = !functionName.startsWith("_")
                && (function.isTopLevelFunction()
                        || (function.enclosingType != null
                                && isPlainTopLevelFunction(function.enclosingFunctionRecord)));
        Comment jsDocNode = AstUtil.getJsDocNode(function.functionNode);

        boolean isReturningFunction = valueReturningFunctions.contains(function);
        boolean isInterfaceFunction =
                function.enclosingType != null && function.enclosingType.isInterface;
        int invalidAnnotationIndex =
                invalidReturnsAnnotationIndex(getState().getNodeText(jsDocNode));
        if (invalidAnnotationIndex != -1) {
            String suggestedResolution = (isReturningFunction || isInterfaceFunction)
                    ? "should be @return instead"
                    : "please remove, as function does not return value";
            getContext().reportErrorInNode(jsDocNode, invalidAnnotationIndex,
                    String.format("invalid @returns annotation found - %s", suggestedResolution));
            return;
        }
        AstNode functionNameNode = getFunctionNameNode(function.functionNode);
        if (functionNameNode == null) {
            return;
        }

        if (isReturningFunction) {
            if (!function.hasReturnAnnotation() && isApiFunction) {
                reportErrorAtNodeStart(
                        functionNameNode,
                        "@return annotation is required for API functions that return value");
            }
        } else {
            // A @return-function that does not actually return anything and
            // is intended to be overridden in subclasses must throw.
            if (function.hasReturnAnnotation()
                    && !isInterfaceFunction
                    && !throwingFunctions.contains(function)) {
                reportErrorAtNodeStart(functionNameNode,
                        "@return annotation found, yet function does not return value");
            }
        }
    }

    private static boolean isPlainTopLevelFunction(FunctionRecord record) {
        return record != null && record.isTopLevelFunction()
                && (record.enclosingType == null && !record.isConstructor);
    }

    private String getFunctionName(FunctionNode functionNode) {
        AstNode nameNode = getFunctionNameNode(functionNode);
        return nameNode == null ? null : getState().getNodeText(nameNode);
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
}
