package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.Token;
import com.google.javascript.rhino.head.ast.Assignment;
import com.google.javascript.rhino.head.ast.AstNode;
import com.google.javascript.rhino.head.ast.Comment;
import com.google.javascript.rhino.head.ast.FunctionNode;
import com.google.javascript.rhino.head.ast.ObjectProperty;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ProtoFollowsExtendsAnnotationCheck extends ValidationCheck {

    private static final String PROTO_PROPERTY_NAME = "__proto__";
    private static final String PROTOTYPE_SUFFIX = ".prototype";
    private static final Pattern EXTENDS_PATTERN =
            Pattern.compile("@extends\\s+\\{\\s*([^\\s}]+)\\s*\\}");

    private final Map<String, ExtendsEntry> typeNameToExtendsEntry = new HashMap<>();
    private final Deque<AstNode> objectLiteralStack = new ArrayDeque<>();
    private final Map<AstNode, String> objectLiteralToPrototypeName = new HashMap<>();

    @Override
    public void doVisit(AstNode node) {
        if (node.getType() == Token.ASSIGN) {
            handleAssignNode((Assignment) node);
            return;
        }
        if (node.getType() == Token.FUNCTION) {
            handleFunctionNode((FunctionNode) node);
            return;
        }
        if (node.getType() == Token.OBJECTLIT) {
            objectLiteralStack.push(node);
            return;
        }
        if (node.getType() == Token.COLON) {
            handleColonNode((ObjectProperty) node);
            return;
        }
    }

    @Override
    public void didTraverseTree() {
        for (Map.Entry<String, ExtendsEntry> e : typeNameToExtendsEntry.entrySet()) {
            ExtendsEntry entry = e.getValue();
            getContext().reportErrorInNode(entry.jsDocNode, entry.offsetInNodeText,
                    String.format("No __proto__ assigned for type %s having @extends", e.getKey()));
        }
    }

    private void handleFunctionNode(FunctionNode node) {
        Comment jsDocNode = getJsDocNode(node);
        if (jsDocNode == null) {
            return;
        }
        AstNode nameNode = AstUtil.getFunctionNameNode(node);
        if (nameNode == null) {
            return;
        }
        String functionTypeName = getContext().getNodeText(nameNode);
        rememberExtendedTypeIfNeeded(functionTypeName, jsDocNode);
    }

    private void handleColonNode(ObjectProperty node) {
        if (objectLiteralStack.isEmpty()) {
            return;
        }
        String propertyName = getContext().getNodeText(node.getLeft());
        if (!PROTO_PROPERTY_NAME.equals(propertyName)) {
            return;
        }
        String value = getContext().getNodeText(node.getRight());
        if (!value.endsWith(PROTOTYPE_SUFFIX)) {
            getContext().reportErrorInNode(
                    node.getRight(), 0, "__proto__ value is not a prototype");
            return;
        }
        String currentPrototype = objectLiteralToPrototypeName.get(objectLiteralStack.peek());
        if (currentPrototype == null) {
            // FIXME: __proto__: Foo.prototype not in an object literal for Bar.prototype.
            return;
        }
        String currentType = getTypeNameFromPrototype(currentPrototype);
        String superType = getTypeNameFromPrototype(value);
        ExtendsEntry entry = typeNameToExtendsEntry.remove(currentType);
        if (entry == null) {
            getContext().reportErrorInNode(node.getRight(), 0, String.format(
                    "No @extends annotation for %s extending %s", currentType, superType));
            return;
        }
        if (!superType.equals(entry.extendedType)) {
            getContext().reportErrorInNode(node.getRight(), 0, String.format(
                    "Supertype does not match %s declared in @extends for %s (line %d)",
                    entry.extendedType, currentType,
                    getContext().getPosition(entry.jsDocNode, entry.offsetInNodeText).line));
        }
    }

    private String getTypeNameFromPrototype(String value) {
        return value.substring(0, value.length() - PROTOTYPE_SUFFIX.length());
    }

    private void handleAssignNode(Assignment assignment) {
        AstNode typeNameNode = assignment.getLeft();
        if (typeNameNode.getType() != Token.GETPROP && typeNameNode.getType() != Token.NAME) {
            return;
        }
        String typeName = getContext().getNodeText(typeNameNode);
        if (typeName.endsWith(PROTOTYPE_SUFFIX)) {
            AstNode prototypeValueNode = assignment.getRight();
            if (prototypeValueNode.getType() == Token.OBJECTLIT) {
                objectLiteralToPrototypeName.put(assignment.getRight(), typeName);
            } else {
                typeName = getTypeNameFromPrototype(typeName);
                ExtendsEntry extendsEntry = typeNameToExtendsEntry.get(typeName);
                if (extendsEntry != null) {
                    getContext().reportErrorInNode(prototypeValueNode, 0, String.format(
                            "@extends found for type %s but its prototype is not an object "
                            + "containing __proto__", typeName));
                }
            }
            return;
        }

        if (assignment.getRight().getType() != Token.FUNCTION) {
            return;
        }

        Comment jsDocNode = getJsDocNode(assignment);
        if (jsDocNode != null) {
            rememberExtendedTypeIfNeeded(typeName, jsDocNode);
        }
    }

    private void rememberExtendedTypeIfNeeded(String typeName, Comment jsDocNode) {
        final ExtendsEntry extendsEntry = getExtendsEntry(jsDocNode);
        if (extendsEntry == null) {
            return;
        }
        typeNameToExtendsEntry.put(typeName, extendsEntry);
    }

    private ExtendsEntry getExtendsEntry(Comment jsDocNode) {
        String jsDoc = getContext().getNodeText(jsDocNode);
        if (!jsDoc.contains("@constructor")) {
            return null;
        }
        Matcher matcher = EXTENDS_PATTERN.matcher(jsDoc);
        if (!matcher.find()) {
            return null;
        }

        return new ExtendsEntry(matcher.group(1), matcher.start(1), jsDocNode);
    }

    @Override
    public void didVisit(AstNode node) {
        if (node.getType() == Token.OBJECTLIT) {
            objectLiteralStack.pop();
            objectLiteralToPrototypeName.remove(node);
        }
    }

    private Comment getJsDocNode(AstNode node) {
        return node.getJsDocNode();
    }

    private static class ExtendsEntry {
        public final String extendedType;
        public final int offsetInNodeText;
        public final Comment jsDocNode;

        public ExtendsEntry(String extendedType, int offsetInNodeText, Comment jsDocNode) {
            this.extendedType = extendedType;
            this.offsetInNodeText = offsetInNodeText;
            this.jsDocNode = jsDocNode;
        }
    }
}
