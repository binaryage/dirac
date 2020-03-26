package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.jscomp.NodeUtil;
import com.google.javascript.rhino.JSDocInfo;
import com.google.javascript.rhino.Node;
import com.google.javascript.rhino.Token;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class DisallowedGlobalPropertiesChecker extends ContextTrackingChecker {
    private static final Set<String> GLOBAL_OBJECT_NAMES = new HashSet<>();
    private static final Set<String> DISALLOWED_PROPERTIES = new HashSet<>();
    static {
        DISALLOWED_PROPERTIES.add("addEventListener");
        DISALLOWED_PROPERTIES.add("removeEventListener");
        DISALLOWED_PROPERTIES.add("requestAnimationFrame");
        DISALLOWED_PROPERTIES.add("cancelAnimationFrame");
        DISALLOWED_PROPERTIES.add("getSelection");
    }

    private static final FunctionRecord TOP_LEVEL_FUNCTION = new FunctionRecord();

    private final Map<FunctionRecord, Set<String>> declaredLocalVariables = new HashMap<>();
    private final Map<FunctionRecord, List<Node>> globalPropertyAccessNodes = new HashMap<>();

    @Override
    protected void enterNode(Node node) {
        switch (node.getToken()) {
            case VAR:
                handleVar(node);
                break;
            case CONST:
                handleVar(node);
                break;
            case LET:
                handleVar(node);
                break;
            case NAME:
                handleName(node);
                break;
            case STRING:
                handleString(node);
                break;
            case FUNCTION:
            case SCRIPT:
                enterFunctionOrScript();
                break;
            default:
                break;
        }
    }

    @Override
    protected void leaveNode(Node node) {
        switch (node.getToken()) {
            case FUNCTION:
            case SCRIPT:
                leaveFunctionOrScript();
                break;
            default:
                break;
        }
    }

    private void enterFunctionOrScript() {
        FunctionRecord function = getCurrentFunction();
        declaredLocalVariables.put(function, new HashSet<String>());
        globalPropertyAccessNodes.put(function, new ArrayList<Node>());
    }

    private void leaveFunctionOrScript() {
        FunctionRecord function = getCurrentFunction();
        if (!function.suppressesGlobalPropertiesCheck()) {
            checkAccessNodes(globalPropertyAccessNodes.get(function));
        }
        declaredLocalVariables.remove(function);
        globalPropertyAccessNodes.remove(function);
    }

    private void checkAccessNodes(List<Node> nodes) {
        FunctionRecord function = getCurrentFunction();
        for (Node node : nodes) {
            String name = getContext().getNodeText(node);
            if (!functionHasVisibleIdentifier(function, name)) {
                reportErrorAtNodeStart(node,
                        String.format(
                                "Access to \"%s\" property of global object is disallowed", name));
            }
        }
    }

    private void handleVar(Node varNode) {
        Node nameNode = varNode.getFirstChild();
        if (nameNode == null) {
            return;
        }
        String name = nameNode.getString();
        if (name != null) {
            declaredLocalVariables.get(getCurrentFunction()).add(name);
        }
    }

    private void handleName(Node nameNode) {
        Node parent = nameNode.getParent();
        if (parent != null && parent.getToken() == Token.FUNCTION) {
            return;
        }

        String name = getContext().getNodeText(nameNode);
        if (!DISALLOWED_PROPERTIES.contains(name)) {
            return;
        }

        if (parent != null && parent.getToken() == Token.GETPROP) {
            boolean isGlobalPropertyAccess = parent.getFirstChild() == nameNode;
            if (!isGlobalPropertyAccess) {
                return;
            }
        }
        globalPropertyAccessNodes.get(getCurrentFunction()).add(nameNode);
    }

    private void handleString(Node stringNode) {
        String name = getContext().getNodeText(stringNode);
        if (!DISALLOWED_PROPERTIES.contains(name)) {
            return;
        }

        Node parent = stringNode.getParent();
        if (parent == null || parent.getToken() != Token.GETPROP) {
            return;
        }

        Node objectNode = parent.getFirstChild();
        boolean isGlobalObjectAccess = objectNode != null && isGlobalObject(objectNode)
                && objectNode.getNext() == stringNode;
        if (isGlobalObjectAccess) {
            globalPropertyAccessNodes.get(getCurrentFunction()).add(stringNode);
        }
    }

    private FunctionRecord getCurrentFunction() {
        FunctionRecord function = getState().getCurrentFunctionRecord();
        return function == null ? TOP_LEVEL_FUNCTION : function;
    }

    private boolean isGlobalObject(Node node) {
        String name = getContext().getNodeText(node);
        if (!GLOBAL_OBJECT_NAMES.contains(name)) {
            return false;
        }
        return node.getToken() == Token.NAME
                && !functionHasVisibleIdentifier(getCurrentFunction(), name);
    }

    private boolean functionHasVisibleIdentifier(FunctionRecord function, String name) {
        if (functionHasLocalIdentifier(function, name)) {
            return true;
        }
        if (function == TOP_LEVEL_FUNCTION) {
            return false;
        }
        FunctionRecord parent = function.enclosingFunctionRecord;
        return functionHasVisibleIdentifier(parent == null ? TOP_LEVEL_FUNCTION : parent, name);
    }

    private boolean functionHasLocalIdentifier(FunctionRecord function, String name) {
        return function.parameterNames.contains(name)
                || declaredLocalVariables.get(function).contains(name);
    }
}
