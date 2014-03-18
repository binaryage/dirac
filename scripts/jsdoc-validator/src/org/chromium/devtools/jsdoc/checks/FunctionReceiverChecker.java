package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.FunctionCall;
import com.google.javascript.rhino.head.ast.FunctionNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class FunctionReceiverChecker extends ContextTrackingChecker {

    private final Map<String, FunctionRecord> nestedFunctionsByName = new HashMap<>();
    private final Map<String, Set<CallSite>> callSitesByFunctionName = new HashMap<>();
    private final Map<String, Set<AstNode>> argumentNodesByName = new HashMap<>();

    @Override
    void enterNode(AstNode node) {
        switch (node.getType()) {
        case Token.CALL:
            handleCall((FunctionCall) node);
            break;
        case Token.FUNCTION:
            FunctionRecord function = getState().getCurrentFunctionRecord();
            if (function == null) {
                break;
            }
            if (function.isTopLevelFunction()) {
                argumentNodesByName.clear();
            } else {
                AstNode nameNode = AstUtil.getFunctionNameNode((FunctionNode) node);
                if (nameNode == null) {
                    break;
                }
                nestedFunctionsByName.put(getContext().getNodeText(nameNode), function);
            }
            break;
        default:
            break;
        }
    }

    private void handleCall(FunctionCall functionCall) {
        String[] targetParts = getContext().getNodeText(functionCall.getTarget()).split("\\.");
        String firstPart = targetParts[0];
        int partCount = targetParts.length;
        List<String> arguments = new ArrayList<>(functionCall.getArguments().size());
        for (AstNode argumentNode : functionCall.getArguments()) {
            String argumentText = getContext().getNodeText(argumentNode);
            arguments.add(argumentText);
            getOrCreateSetByKey(argumentNodesByName, argumentText).add(argumentNode);
        }
        boolean hasBind = partCount > 1 && "bind".equals(targetParts[partCount - 1]);
        if (hasBind && partCount == 3 && "this".equals(firstPart) &&
            !(arguments.size() > 0 && "this".equals(arguments.get(0)))) {
                reportErrorAtNodeStart(functionCall,
                        "Member function can only be bound to 'this' as the receiver");
                return;
        }
        if (partCount > 2 || "this".equals(firstPart)) {
            return;
        }
        boolean hasReceiver = hasBind && isReceiverSpecified(arguments);
        hasReceiver |= (partCount == 2) &&
                ("call".equals(targetParts[1]) || "apply".equals(targetParts[1])) &&
                isReceiverSpecified(arguments);
        getOrCreateSetByKey(callSitesByFunctionName, firstPart)
                .add(new CallSite(hasReceiver, functionCall));
    }

    private static <K, T> Set<T> getOrCreateSetByKey(Map<K, Set<T>> map, K key) {
        Set<T> set = map.get(key);
        if (set == null) {
            set = new HashSet<>();
            map.put(key, set);
        }
        return set;
    }

    private boolean isReceiverSpecified(List<String> arguments) {
        return arguments.size() > 0 && !"null".equals(arguments.get(0));
    }

    @Override
    void leaveNode(AstNode node) {
        if (node.getType() != Token.FUNCTION) {
            return;
        }

        FunctionRecord function = getState().getCurrentFunctionRecord();
        if (function == null || !function.isTopLevelFunction()) {
            return;
        }

        for (FunctionRecord record : nestedFunctionsByName.values()) {
            processNestedFunction(record);
        }
        nestedFunctionsByName.clear();
        callSitesByFunctionName.clear();
        argumentNodesByName.clear();
    }

    private void processNestedFunction(FunctionRecord record) {
        String name = record.name;
        Set<AstNode> argumentUsages = argumentNodesByName.get(name);
        Set<CallSite> callSites = callSitesByFunctionName.get(name);
        boolean hasThisAnnotation = AstUtil.hasThisAnnotation(record.functionNode, getContext());
        if (hasThisAnnotation && argumentUsages != null) {
            for (AstNode argumentNode : argumentUsages) {
                reportErrorAtNodeStart(argumentNode,
                        "Function annotated with @this used as argument without " +
                         "bind(<non-null-receiver>)");
            }
        }

        if (callSites == null) {
            return;
        }
        for (CallSite callSite : callSites) {
            if (hasThisAnnotation == callSite.hasReceiver || record.isConstructor) {
                continue;
            }
            if (callSite.hasReceiver) {
                reportErrorAtNodeStart(callSite.callNode,
                        "Receiver specified for a function not annotated with @this");
            } else {
                reportErrorAtNodeStart(callSite.callNode,
                        "Receiver not specified for a function annotated with @this");
            }
        }
    }

    private static class CallSite {
        boolean hasReceiver;
        FunctionCall callNode;

        public CallSite(boolean hasReceiver, FunctionCall callNode) {
            this.hasReceiver = hasReceiver;
            this.callNode = callNode;
        }
    }
}
