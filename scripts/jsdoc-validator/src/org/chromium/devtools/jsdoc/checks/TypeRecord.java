package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.ast.Comment;

import java.util.List;

public class TypeRecord {
    public final String typeName;
    public final boolean isInterface;
    public final List<InheritanceEntry> extendedTypes;

    public TypeRecord(String typeName, boolean isInterface,
            List<InheritanceEntry> extendedTypes) {
        this.typeName = typeName;
        this.isInterface = isInterface;
        this.extendedTypes = extendedTypes;
    }

    public InheritanceEntry getFirstExtendedType() {
        return this.extendedTypes.isEmpty() ? null : this.extendedTypes.get(0);
    }

    public static class InheritanceEntry {
        public final String superTypeName;
        public final Comment jsDocNode;
        public final int offsetInJsDocText;

        public InheritanceEntry(String superTypeName, Comment jsDocNode, int offsetInJsDocText) {
            this.superTypeName = superTypeName;
            this.offsetInJsDocText = offsetInJsDocText;
            this.jsDocNode = jsDocNode;
        }
    }
}
