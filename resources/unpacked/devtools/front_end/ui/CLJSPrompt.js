WebInspector.CLJSPromptWithHistory = function(codeMirrorInstance, completions, stopCharacters)
{
    WebInspector.TextPromptWithHistory.call(this, completions, stopCharacters);

    this._codeMirror = codeMirrorInstance;
};

WebInspector.CLJSPromptWithHistory.prototype = {

    text: function()
    {
        var text = this._codeMirror.getValue();
        return text.replace(/[\s\n]+$/gm, ""); // remove trailing newlines and whitespace
    },

    setText: function(x)
    {
        this._removeSuggestionAids();
        this._codeMirror.setValue(x);
        this.moveCaretToEndOfPrompt();
        this._element.scrollIntoView();
    },

    isCaretInsidePrompt: function()
    {
        return this._codeMirror.hasFocus();
    },

    isCaretAtEndOfPrompt: function()
    {
        var content = this._codeMirror.getValue();
        var cursor = this._codeMirror.getCursor();
        var endCursor = this._codeMirror.posFromIndex(content.length);
        return (cursor.line == endCursor.line && cursor.ch == endCursor.ch);
    },

    isCaretOnFirstLine: function()
    {
        var cursor = this._codeMirror.getCursor();
        return (cursor.line == this._codeMirror.firstLine());
    },

    isCaretOnLastLine: function()
    {
        var cursor = this._codeMirror.getCursor();
        return (cursor.line == this._codeMirror.lastLine());
    },

    moveCaretToEndOfPrompt: function()
    {
       this._codeMirror.setCursor(this._codeMirror.lastLine()+1, 0);
    },

    moveCaretToIndex: function(index)
    {
       var pos = this._codeMirror.posFromIndex(index);
       this._codeMirror.setCursor(pos);
    },


    __proto__: WebInspector.TextPromptWithHistory.prototype
};