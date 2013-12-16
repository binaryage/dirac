package org.chromium.devtools.jsdoc;

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

    public void reportError(int lineNumber, int absoluteOffset, String errorMessage) {
        int columnNumber = scriptText.getColumn(absoluteOffset);
        StringBuilder positionMarker = new StringBuilder(columnNumber);
        for (int i = columnNumber; i > 0; --i) {
            positionMarker.append(' ');
        }
        positionMarker.append('^');
        validationResult.add(new MessageRecord(
                absoluteOffset,
                String.format("%s:%d: ERROR - %s\n%s\n%s\n",
                        scriptFileName,
                        lineNumber,
                        errorMessage,
                        scriptText.getLineTextAt(absoluteOffset),
                        positionMarker.toString())));
    }

    public static class MessageRecord {
        public final int position;
        public final String text;

        public MessageRecord(int position, String text) {
            this.position = position;
            this.text = text;
        }
    }
}
