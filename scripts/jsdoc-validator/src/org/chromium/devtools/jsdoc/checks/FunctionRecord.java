package org.chromium.devtools.jsdoc.checks;

import com.google.javascript.jscomp.NodeUtil;
import com.google.javascript.rhino.JSDocInfo;
import com.google.javascript.rhino.Node;

public class FunctionRecord {
    final Node functionNode;
    final JSDocInfo info;
    final String name;
    final TypeRecord enclosingType;
    final FunctionRecord enclosingFunctionRecord;

    public FunctionRecord(Node functionNode, String name,
            TypeRecord parentType,
            FunctionRecord enclosingFunctionRecord) {
        this.functionNode = functionNode;
        this.info = NodeUtil.getBestJSDocInfo(functionNode);
        this.name = name;
        this.enclosingType = parentType;
        this.enclosingFunctionRecord = enclosingFunctionRecord;
    }

    public boolean isConstructor() {
        return info != null && info.isConstructor();
    }

    public boolean isTopLevelFunction() {
        return enclosingFunctionRecord == null;
    }

    public boolean hasReturnAnnotation() {
        return info != null && info.getReturnType() != null;
    }

    public boolean hasThisAnnotation() {
        return info != null && info.getThisType() != null;
    }

    public boolean suppressesReceiverCheck() {
        return info != null && info.getOriginalCommentString().contains("@suppressReceiverCheck");
    }

    @Override
    public String toString() {
        return (info == null ? "" : info.getOriginalCommentString() + "\n") +
                (name == null ? "<anonymous>" : name) + "() @" +
                functionNode.getLineno();
    }
}
