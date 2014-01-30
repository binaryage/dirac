package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.Assignment;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.ObjectProperty;

import org.chromium.devtools.jsdoc.checks.TypeRecord.InheritanceEntry;

import java.util.HashSet;
import java.util.Set;

public final class ProtoFollowsExtendsChecker extends ContextTrackingChecker {

    private static final String PROTO_PROPERTY_NAME = "__proto__";
    private final Set<TypeRecord> typesWithAssignedProto = new HashSet<>();

    @Override
    protected void enterNode(AstNode node) {
        if (node.getType() == Token.COLON) {
            handleColonNode((ObjectProperty) node);
            return;
        }
        if (node.getType() == Token.ASSIGN) {
            handleAssignment((Assignment) node);
            return;
        }
    }

    @Override
    protected void leaveNode(AstNode node) {
        if (node.getType() == Token.SCRIPT) {
            checkFinished();
        }
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
            state.getContext().reportErrorInNode(
                    node.getRight(), 0, "__proto__ value is not a prototype");
            return;
        }
        String superType = AstUtil.getTypeNameFromPrototype(value);
        if (type.isInterface) {
            state.getContext().reportErrorInNode(node.getLeft(), 0, String.format(
                    "__proto__ defined for interface %s", type.typeName));
            return;
        } else {
            if (type.extendedTypes.isEmpty()) {
                state.getContext().reportErrorInNode(node.getRight(), 0, String.format(
                        "No @extends annotation for %s extending %s", type.typeName, superType));
                return;
            }
        }
        // FIXME: Should we check that there is only one @extend-ed type
        // for the non-interface |type|? Closure is supposed to do this anyway...
        InheritanceEntry entry = type.getFirstExtendedType();
        String extendedTypeName = entry.superTypeName;
        if (!superType.equals(extendedTypeName)) {
            state.getContext().reportErrorInNode(node.getRight(), 0, String.format(
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
            state.getContext().reportErrorInNode(prototypeValueNode, 0, String.format(
                    "@extends found for type %s but its prototype is not an object "
                    + "containing __proto__", AstUtil.getTypeNameFromPrototype(assignedTypeName)));
        }
    }
}
