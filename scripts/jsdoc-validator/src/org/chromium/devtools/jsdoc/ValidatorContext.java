package org.chromium.devtools.jsdoc;

import com.google.javascript.rhino.head.ast.AstNode;

import java.util.Collections;
import java.util.Comparator;
import java.util.SortedSet;
import java.util.TreeSet;

public class ValidatorContext {

    private static final Comparator<MessageRecord> MESSAGE_RECORD_COMPARATOR =
            new Comparator<MessageRecord>() {
                @Override
                public int compare(MessageRecord left, MessageRecord right) {
                    return left.position - right.position;
                }
            };

    public final ScriptText scriptText;
    public final String scriptFileName;
    private final SortedSet<MessageRecord> validationResult =
            new TreeSet<>(MESSAGE_RECORD_COMPARATOR);

    public ValidatorContext(ScriptText scriptText, String scriptFileName) {
        this.scriptText = scriptText;
        this.scriptFileName = scriptFileName;
    }

    public SortedSet<MessageRecord> getValidationResult() {
        return Collections.unmodifiableSortedSet(validationResult);
    }

    public String getNodeText(AstNode node) {
        return scriptText.text.substring(
                node.getAbsolutePosition(), node.getAbsolutePosition() + node.getLength());
    }

    public SourcePosition getPosition(AstNode node, int offsetInNodeText) {
        String nodeText = getNodeText(node);
        if (offsetInNodeText >= nodeText.length())
            return null;
        int line = node.getLineno();
        int column = scriptText.getColumn(node.getAbsolutePosition());
        for (int i = 0; i < offsetInNodeText; ++i) {
            char ch = nodeText.charAt(i);
            if (ch == '\n') {
                line += 1;
                column = 0;
                continue;
            }
            column += 1;
        }
        return new SourcePosition(line, column);
    }

    public void reportErrorInNode(AstNode node, int offsetInNodeText, String errorMessage) {
        SourcePosition position = getPosition(node, offsetInNodeText);
        if (position == null) {
            // FIXME: Handle error?
            return;
        }
        StringBuilder positionMarker = new StringBuilder(position.column + 1);
        for (int i = position.column; i > 0; --i) {
            positionMarker.append(' ');
        }
        positionMarker.append('^');
        int errorAbsolutePosition = node.getAbsolutePosition() + offsetInNodeText;
        String message = String.format("%s:%d: ERROR - %s\n%s\n%s\n",
                scriptFileName,
                position.line,
                errorMessage,
                scriptText.getLineTextAt(errorAbsolutePosition),
                positionMarker.toString());
        validationResult.add(new MessageRecord(errorAbsolutePosition, message));
    }

    public static class MessageRecord {
        public final int position;
        public final String text;

        public MessageRecord(int position, String text) {
            this.position = position;
            this.text = text;
        }
    }

    public static class SourcePosition {
        public final int line;
        public final int column;

        public SourcePosition(int line, int column) {
            this.line = line;
            this.column = column;
        }
    }
}
