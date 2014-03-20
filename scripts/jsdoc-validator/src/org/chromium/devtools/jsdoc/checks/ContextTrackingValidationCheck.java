package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.Assignment;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.Comment;
import com.google.javascript.rhino.head.ast.FunctionNode;

import org.chromium.devtools.jsdoc.ValidationCheck;
import org.chromium.devtools.jsdoc.ValidatorContext;
import org.chromium.devtools.jsdoc.checks.TypeRecord.InheritanceEntry;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ContextTrackingValidationCheck extends ValidationCheck {

    private static final Pattern EXTENDS_PATTERN =
            Pattern.compile("@extends\\s+\\{\\s*([^\\s}]+)\\s*\\}");
    private static final Pattern RETURN_PATTERN =
            Pattern.compile("@return\\s+\\{\\s*(.+)\\s*\\}");
    private ContextTrackingState state;
    private final List<ContextTrackingChecker> clients = new ArrayList<>(5);

    @Override
    protected void setContext(ValidatorContext context) {
        super.setContext(context);
        state = new ContextTrackingState(context);
        registerClient(new ProtoFollowsExtendsChecker());
        registerClient(new ReturnAnnotationChecker());
        registerClient(new FunctionReceiverChecker());
    }

    @Override
    public void doVisit(AstNode node) {
        switch (node.getType()) {
        case Token.ASSIGN:
            enterAssignNode((Assignment) node);
            break;
        case Token.FUNCTION:
            enterFunctionNode((FunctionNode) node);
            break;
        default:
            break;
        }

        enterNode(node);
    }

    @Override
    public void didVisit(AstNode node) {
        leaveNode(node);

        switch (node.getType()) {
        case Token.ASSIGN:
            leaveAssignNode((Assignment) node);
            break;
        case Token.FUNCTION:
            leaveFunctionNode((FunctionNode) node);
            break;
        default:
            break;
        }
    }

    public void registerClient(ContextTrackingChecker client) {
        this.clients.add(client);
        client.setState(state);
    }

    private void enterNode(AstNode node) {
        for (ContextTrackingChecker client : clients) {
            client.enterNode(node);
        }
    }

    private void leaveNode(AstNode node) {
        for (ContextTrackingChecker client : clients) {
            client.leaveNode(node);
        }
    }

    private void enterFunctionNode(FunctionNode node) {
        Comment jsDocNode = getJsDocNode(node);
        AstNode nameNode = AstUtil.getFunctionNameNode(node);

        // It can be a type declaration: /** @constructor */ function MyType() {...}.
        String functionName = getNodeText(nameNode);
        boolean isConstructor =
                functionName != null && rememberTypeRecordIfNeeded(functionName, jsDocNode);
        TypeRecord parentType = state.getCurrentFunctionRecord() == null
                ? state.getCurrentTypeRecord()
                : null;
        state.pushFunctionRecord(new FunctionRecord(
                node,
                functionName,
                isConstructor,
                getReturnType(jsDocNode),
                parentType,
                state.getCurrentFunctionRecord()));
    }

    @SuppressWarnings("unused")
    private void leaveFunctionNode(FunctionNode node) {
        state.functionRecords.removeLast();
    }

    private String getReturnType(Comment jsDocNode) {
        if (jsDocNode == null) {
            return null;
        }
        String jsDoc = getNodeText(jsDocNode);
        Matcher m = RETURN_PATTERN.matcher(jsDoc);
        if (!m.find()) {
            return null;
        }
        return m.group(1);
    }

    private void enterAssignNode(Assignment assignment) {
        String assignedTypeName = getAssignedTypeName(assignment);
        if (assignedTypeName == null) {
            return;
        }
        if (AstUtil.isPrototypeName(assignedTypeName)) {
            // MyType.prototype = ...
            String typeName = AstUtil.getTypeNameFromPrototype(assignedTypeName);
            TypeRecord typeRecord = state.typeRecordsByTypeName.get(typeName);
            // We should push anything here to maintain a valid current type record.
            state.pushTypeRecord(typeRecord);
            state.pushFunctionRecord(null);
            return;
        }

        if (assignment.getRight().getType() == Token.FUNCTION) {
            // MyType = function() {...}
            rememberTypeRecordIfNeeded(assignedTypeName, getJsDocNode(assignment));
        }

    }

    private void leaveAssignNode(Assignment assignment) {
        String assignedTypeName = getAssignedTypeName(assignment);
        if (assignedTypeName == null) {
            return;
        }
        if (AstUtil.isPrototypeName(assignedTypeName)) {
            // Remove the current type record when leaving prototype object.
            state.typeRecords.removeLast();
            state.functionRecords.removeLast();
            return;
        }
    }

    private String getAssignedTypeName(Assignment assignment) {
        AstNode node = AstUtil.getAssignedTypeNameNode(assignment);
        return getNodeText(node);
    }

    private boolean rememberTypeRecordIfNeeded(String typeName, Comment jsDocNode) {
        String jsDoc = getNodeText(jsDocNode);
        if (!isConstructor(jsDoc) && !isInterface(jsDoc)) {
            return false;
        }
        TypeRecord record = new TypeRecord(
                typeName,
                isInterface(jsDoc),
                getExtendsEntries(jsDocNode));
        state.typeRecordsByTypeName.put(typeName, record);
        return true;
    }

    private static boolean isInterface(String jsDoc) {
        return jsDoc != null && jsDoc.contains("@interface");
    }

    private static boolean isConstructor(String jsDoc) {
        return jsDoc != null && jsDoc.contains("@constructor");
    }

    private static Comment getJsDocNode(AstNode node) {
        if (node.getType() == Token.FUNCTION) {
            return AstUtil.getJsDocNode((FunctionNode) node);
        }
        return node.getJsDocNode();
    }

    private List<InheritanceEntry> getExtendsEntries(Comment jsDocNode) {
        if (jsDocNode == null) {
            return Collections.emptyList();
        }
        List<InheritanceEntry> result = new ArrayList<>(2);
        Matcher matcher = EXTENDS_PATTERN.matcher(getNodeText(jsDocNode));
        while (matcher.find()) {
            result.add(new InheritanceEntry(matcher.group(1), jsDocNode, matcher.start(1)));
        }

        return result;
    }
}
