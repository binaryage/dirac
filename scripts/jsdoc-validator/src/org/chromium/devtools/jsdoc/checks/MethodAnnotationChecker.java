package org.chromium.devtools.jsdoc.checks;

import com.google.common.base.Joiner;
import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.Comment;
import com.google.javascript.rhino.head.ast.FunctionNode;
import com.google.javascript.rhino.head.ast.ObjectProperty;
import com.google.javascript.rhino.head.ast.ReturnStatement;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class MethodAnnotationChecker extends ContextTrackingChecker {

    private static final Pattern PARAM_PATTERN =
            Pattern.compile("@param\\s+\\{.+\\}\\s+([^\\s]+)(?:[^}]*)$", Pattern.MULTILINE);

    private final Set<FunctionRecord> valueReturningFunctions = new HashSet<>();
    private final Set<FunctionRecord> throwingFunctions = new HashSet<>();

    @Override
    public void enterNode(AstNode node) {
        switch (node.getType()) {
        case Token.FUNCTION:
            handleFunction((FunctionNode) node);
            break;
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

    private void handleFunction(FunctionNode node) {
        int actualParamCount = node.getParams().size();
        if (actualParamCount == 0) {
            return;
        }
        Comment jsDocNode = AstUtil.getJsDocNode(node);
        String[] nonAnnotatedParams = getNonAnnotatedParamData(node.getParams(), jsDocNode);
        if (nonAnnotatedParams.length > 0 && node.getParams().size() != nonAnnotatedParams.length) {
            reportErrorAtNodeStart(jsDocNode, String.format(
                    "No @param JSDoc tag found for parameters: [%s]",
                    Joiner.on(',').join(nonAnnotatedParams)));
        }
    }

    private String[] getNonAnnotatedParamData(List<AstNode> params, Comment jsDocNode) {
        if (jsDocNode == null) {
            return new String[0];
        }
        Set<String> paramNames = new HashSet<>();
        for (AstNode paramNode : params) {
            String paramName = getContext().getNodeText(paramNode);
            if (!paramNames.add(paramName)) {
                reportErrorAtNodeStart(paramNode,
                        String.format("Duplicate function argument name: %s", paramName));
            }
        }
        String jsDoc = getContext().getNodeText(jsDocNode);
        Matcher m = PARAM_PATTERN.matcher(jsDoc);
        while (m.find()) {
            String jsDocParam = m.group(1);
            paramNames.remove(jsDocParam);
        }
        return paramNames.toArray(new String[paramNames.size()]);
    }

    private void handleReturn(ReturnStatement node) {
        if (node.getReturnValue() == null || AstUtil.parentOfType(node, Token.ASSIGN) != null) {
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

        ObjectProperty parent = (ObjectProperty) AstUtil.parentOfType(functionNode, Token.COLON);
        if (parent != null) {
            return parent.getLeft();
        }
        // Do not require annotation for assignment-RHS functions.
        return null;
    }
}
