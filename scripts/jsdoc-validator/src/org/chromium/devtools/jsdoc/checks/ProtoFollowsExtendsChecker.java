package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.Assignment;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.FunctionCall;
import com.google.javascript.rhino.head.ast.ObjectProperty;

import org.chromium.devtools.jsdoc.checks.TypeRecord.InheritanceEntry;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class ProtoFollowsExtendsChecker extends ContextTrackingChecker {

    private static final String PROTO_PROPERTY_NAME = "__proto__";
    private static final Set<String> IGNORED_SUPER_TYPES = new HashSet<>();
    static {
        IGNORED_SUPER_TYPES.add("WebInspector.Object");
    }

    private final Set<TypeRecord> typesWithAssignedProto = new HashSet<>();
    private final Set<FunctionRecord> functionsMissingSuperCall = new HashSet<>();

    @Override
    protected void enterNode(AstNode node) {
        switch (node.getType()) {
        case Token.ASSIGN:
            handleAssignment((Assignment) node);
            break;
        case Token.COLON:
            handleColonNode((ObjectProperty) node);
            break;
        case Token.FUNCTION:
            enterFunction();
            break;
        case Token.CALL:
            handleCall((FunctionCall) node);
            break;
        default:
            break;
        }
    }

    private void handleCall(FunctionCall callNode) {
        FunctionRecord contextFunction = getState().getCurrentFunctionRecord();
        if (contextFunction == null || !contextFunction.isConstructor
                || !functionsMissingSuperCall.contains(contextFunction)) {
            return;
        }
        String typeName = validSuperConstructorName(callNode);
        if (typeName == null) {
            return;
        }
        TypeRecord typeRecord = getState().typeRecordsByTypeName.get(contextFunction.name);
        if (typeRecord == null) {
            return;
        }
        InheritanceEntry extendedType = typeRecord.getFirstExtendedType();
        if (extendedType == null || !extendedType.superTypeName.equals(typeName)) {
            return;
        }
        functionsMissingSuperCall.remove(contextFunction);
    }

    private String validSuperConstructorName(FunctionCall callNode) {
        String callTarget = getContext().getNodeText(callNode.getTarget());
        int lastDotIndex = callTarget.lastIndexOf('.');
        if (lastDotIndex == -1) {
            return null;
        }
        String methodName = callTarget.substring(lastDotIndex + 1);
        if (!"call".equals(methodName) && !"apply".equals(methodName)) {
            return null;
        }
        List<AstNode> arguments = callNode.getArguments();
        if (arguments.isEmpty() || !"this".equals(getContext().getNodeText(arguments.get(0)))) {
            return null;
        }
        return callTarget.substring(0, lastDotIndex);
    }

    @Override
    protected void leaveNode(AstNode node) {
        if (node.getType() == Token.SCRIPT) {
            checkFinished();
            return;
        }
        if (node.getType() == Token.FUNCTION) {
            leaveFunction();
            return;
        }
    }

    private void enterFunction() {
        FunctionRecord function = getState().getCurrentFunctionRecord();
        InheritanceEntry extendedType = getExtendedTypeToCheck(function);
        if (extendedType == null) {
            return;
        }
        if (!IGNORED_SUPER_TYPES.contains(extendedType.superTypeName)) {
            functionsMissingSuperCall.add(function);
        }
    }

    private void leaveFunction() {
        FunctionRecord function = getState().getCurrentFunctionRecord();
        if (!functionsMissingSuperCall.contains(function)) {
            return;
        }
        InheritanceEntry extendedType = getExtendedTypeToCheck(function);
        if (extendedType == null) {
            return;
        }
        reportErrorAtNodeStart(AstUtil.getFunctionNameNode(function.functionNode),
                String.format("Type %s extends %s but does not properly invoke its constructor",
                        function.name, extendedType.superTypeName));
    }

    private InheritanceEntry getExtendedTypeToCheck(FunctionRecord function) {
        if (!function.isConstructor || function.name == null) {
            return null;
        }
        TypeRecord type = getState().typeRecordsByTypeName.get(function.name);
        if (type == null || type.isInterface) {
            return null;
        }
        return type.getFirstExtendedType();
    }

    private void checkFinished() {
        for (TypeRecord record : getState().getTypeRecordsByTypeName().values()) {
            if (record.isInterface || typesWithAssignedProto.contains(record)) {
                continue;
            }
            InheritanceEntry entry = record.getFirstExtendedType();
            if (entry != null) {
                getContext().reportErrorInNode(
                        entry.jsDocNode, entry.offsetInJsDocText,
                        String.format("No __proto__ assigned for type %s having @extends",
                                record.typeName));
            }
        }
    }

    private void handleColonNode(ObjectProperty node) {
        ContextTrackingState state = getState();
        TypeRecord type = state.getCurrentTypeRecord();
        if (type == null) {
            return;
        }
        String propertyName = state.getNodeText(node.getLeft());
        if (!PROTO_PROPERTY_NAME.equals(propertyName)) {
            return;
        }
        TypeRecord currentType = state.getCurrentTypeRecord();
        if (currentType == null) {
            // FIXME: __proto__: Foo.prototype not in an object literal for Bar.prototype.
            return;
        }
        typesWithAssignedProto.add(currentType);
        String value = state.getNodeText(node.getRight());
        if (!AstUtil.isPrototypeName(value)) {
            reportErrorAtNodeStart(
                    node.getRight(), "__proto__ value is not a prototype");
            return;
        }
        String superType = AstUtil.getTypeNameFromPrototype(value);
        if (type.isInterface) {
            reportErrorAtNodeStart(node.getLeft(), String.format(
                    "__proto__ defined for interface %s", type.typeName));
            return;
        } else {
            if (type.extendedTypes.isEmpty()) {
                reportErrorAtNodeStart(node.getRight(), String.format(
                        "No @extends annotation for %s extending %s", type.typeName, superType));
                return;
            }
        }
        // FIXME: Should we check that there is only one @extend-ed type
        // for the non-interface |type|? Closure is supposed to do this anyway...
        InheritanceEntry entry = type.getFirstExtendedType();
        String extendedTypeName = entry.superTypeName;
        if (!superType.equals(extendedTypeName)) {
            reportErrorAtNodeStart(node.getRight(), String.format(
                    "Supertype does not match %s declared in @extends for %s (line %d)",
                    extendedTypeName, type.typeName,
                    state.getContext().getPosition(entry.jsDocNode, entry.offsetInJsDocText).line));
        }
    }

    private void handleAssignment(Assignment assignment) {
        String assignedTypeName =
                getState().getNodeText(AstUtil.getAssignedTypeNameNode(assignment));
        if (assignedTypeName == null) {
            return;
        }
        if (!AstUtil.isPrototypeName(assignedTypeName)) {
            return;
        }
        AstNode prototypeValueNode = assignment.getRight();

        if (prototypeValueNode.getType() == Token.OBJECTLIT) {
            return;
        }

        // Foo.prototype = notObjectLiteral
        ContextTrackingState state = getState();
        TypeRecord type = state.getCurrentTypeRecord();
        if (type == null) {
            // Assigning a prototype for unknown type. Leave it to the closure compiler.
            return;
        }
        if (!type.extendedTypes.isEmpty()) {
            reportErrorAtNodeStart(prototypeValueNode, String.format(
                    "@extends found for type %s but its prototype is not an object "
                    + "containing __proto__", AstUtil.getTypeNameFromPrototype(assignedTypeName)));
        }
    }
}
