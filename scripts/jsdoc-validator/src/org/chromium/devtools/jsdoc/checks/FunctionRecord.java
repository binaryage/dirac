package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.rhino.head.ast.FunctionNode;

public class FunctionRecord {
    final FunctionNode functionNode;
    final boolean isConstructor;
    final String returnType;
    final TypeRecord enclosingType;
    final FunctionRecord enclosingFunctionRecord;

    public FunctionRecord(FunctionNode functionNode, boolean isConstructor,
            String returnType, TypeRecord parentType, FunctionRecord enclosingFunctionRecord) {
        this.functionNode = functionNode;
        this.isConstructor = isConstructor;
        this.returnType = returnType;
        this.enclosingType = parentType;
        this.enclosingFunctionRecord = enclosingFunctionRecord;
    }

    public boolean isTopLevelFunction() {
        return enclosingFunctionRecord == null;
    }

    public boolean hasReturnAnnotation() {
        return returnType != null;
    }
}
