package org.chromium.devtools.jsdoc;

public class ScriptText {

    public final String text;

    public ScriptText(String text) {
        this.text = text;
    }

    public int getColumn(int offset) {
        int lineStart = findLineStart(offset);
        return lineStart == -1 ? -1 : offset - lineStart;
    }

    public String getLineTextAt(int offset) {
        int lineStart = findLineStart(offset);
        if (lineStart == -1) {
            return null;
        }
        int lineEnd = text.indexOf('\n', offset);
        if (lineEnd == -1) {
            lineEnd = text.length();
        }
        return text.substring(lineStart, lineEnd);
    }

    private int findLineStart(int offset) {
        if (offset > text.length()) {
            return -1;
        }
        return text.lastIndexOf('\n', offset) + 1;
    }
}
