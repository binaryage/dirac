/**
 * @constructor
 * @extends {WebInspector.TextPromptWithHistory}
 * @param {!CodeMirror} codeMirrorInstance
 * @param {function(!Element, string, number, !Range, boolean, function(!Array.<string>, number=))} completions
 * @param {string=} stopCharacters
 */
WebInspector.DiracPromptWithHistory = function(codeMirrorInstance, completions, stopCharacters)
{
    WebInspector.TextPromptWithHistory.call(this, completions, stopCharacters);

    this._codeMirror = codeMirrorInstance;
};

WebInspector.DiracPromptWithHistory.prototype = {

    /**
      * @override
      * @return {string}
      */
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

    /**
      * @override
      * @return {boolean}
      */
    isCaretInsidePrompt: function()
    {
        return this._codeMirror.hasFocus();
    },

    /**
      * @override
      * @return {boolean}
      */
    isCaretAtEndOfPrompt: function()
    {
        var content = this._codeMirror.getValue();
        var cursor = this._codeMirror.getCursor();
        var endCursor = this._codeMirror.posFromIndex(content.length);
        return (cursor.line == endCursor.line && cursor.ch == endCursor.ch);
    },

    /**
      * @override
      * @return {boolean}
      */
    isCaretOnFirstLine: function()
    {
        var cursor = this._codeMirror.getCursor();
        return (cursor.line == this._codeMirror.firstLine());
    },

    /**
      * @override
      * @return {boolean}
      */
    isCaretOnLastLine: function()
    {
        var cursor = this._codeMirror.getCursor();
        return (cursor.line == this._codeMirror.lastLine());
    },

    moveCaretToEndOfPrompt: function()
    {
       this._codeMirror.setCursor(this._codeMirror.lastLine()+1, 0, null);
    },

    moveCaretToIndex: function(index)
    {
       var pos = this._codeMirror.posFromIndex(index);
       this._codeMirror.setCursor(pos, null, null);
    },

    complete: function(force, reverse)
    {
      // HACK: temporary override to prevent exceptions
    },


    __proto__: WebInspector.TextPromptWithHistory.prototype
};