package org.chromium.devtools.jsdoc;

public class ValidatorContext {

    public final ScriptText scriptText;
    public final String scriptFileName;
    private final StringBuilder validationResult = new StringBuilder();

    public ValidatorContext(ScriptText scriptText, String scriptFileName) {
        this.scriptText = scriptText;
        this.scriptFileName = scriptFileName;
    }

    public String getValidationResult() {
        return validationResult.toString();
    }

    public void reportError(int lineNumber, int absoluteOffset, String errorMessage) {
        int columnNumber = scriptText.getColumn(absoluteOffset);
        StringBuilder positionMarker = new StringBuilder(columnNumber);
        for (int i = columnNumber; i > 0; --i) {
            positionMarker.append(' ');
        }
        positionMarker.append('^');
        validationResult.append(String.format("%s%s:%d: ERROR - %s\n%s\n%s\n",
                validationResult.length() > 0 ? "\n" : "",
                scriptFileName,
                lineNumber,
                errorMessage,
                scriptText.getLineTextAt(absoluteOffset),
                positionMarker.toString()));
    }
}
