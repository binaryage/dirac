/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

/**
 * @constructor
 * @param {!string} dirPath
 * @param {!string} name
 * @param {!function(?WebInspector.TempFile)} callback
 */
WebInspector.TempFile = function(dirPath, name, callback)
{
    this._fileEntry = null;
    this._writer = null;

    /**
     * @param {!FileSystem} fs
     * @this {WebInspector.TempFile}
     */
    function didInitFs(fs)
    {
        fs.root.getDirectory(dirPath, { create: true }, didGetDir.bind(this), boundErrorHandler);
    }

    /**
     * @param {!DirectoryEntry} dir
     * @this {WebInspector.TempFile}
     */
    function didGetDir(dir)
    {
        dir.getFile(name, { create: true }, didCreateFile.bind(this), boundErrorHandler);
    }

    /**
     * @param {!FileEntry} fileEntry
     * @this {WebInspector.TempFile}
     */
    function didCreateFile(fileEntry)
    {
        this._fileEntry = fileEntry;
        fileEntry.createWriter(didCreateWriter.bind(this), boundErrorHandler);
    }

    /**
     * @param {!FileWriter} writer
     * @this {WebInspector.TempFile}
     */
    function didCreateWriter(writer)
    {
        /**
         * @this {WebInspector.TempFile}
         */
        function didTruncate(e)
        {
            this._writer = writer;
            writer.onwrite = null;
            writer.onerror = null;
            callback(this);
        }
        function onTruncateError(e)
        {
            WebInspector.log("Failed to truncate temp file " + e.code + " : " + e.message,
                             WebInspector.ConsoleMessage.MessageLevel.Error);
            callback(null);
        }
        if (writer.length) {
            writer.onwrite = didTruncate.bind(this);
            writer.onerror = onTruncateError.bind(this);
            writer.truncate(0);
        } else {
            this._writer = writer;
            callback(this);
        }
    }

    function errorHandler(e)
    {
        WebInspector.log("Failed to create temp file " + e.code + " : " + e.message,
                         WebInspector.ConsoleMessage.MessageLevel.Error);
        callback(null);
    }
    var boundErrorHandler = errorHandler.bind(this)
    window.requestFileSystem(window.TEMPORARY, 10, didInitFs.bind(this), errorHandler.bind(this));
}

WebInspector.TempFile.prototype = {
    /**
     * @param {!string} data
     * @param {!function(boolean)} callback
     */
    write: function(data, callback)
    {
        var blob = new Blob([data], {type: 'text/plain'});
        this._writer.onerror = function(e)
        {
            WebInspector.log("Failed to write into a temp file: " + e.message,
                             WebInspector.ConsoleMessage.MessageLevel.Error);
            callback(false);
        }
        this._writer.onwrite = function(e)
        {
            callback(true);
        }
        this._writer.write(blob);
    },

    finishWriting: function()
    {
        this._writer = null;
    },

    /**
     * @param {function(?string)} callback
     */
    read: function(callback)
    {
        /**
         * @param {!File} file
         * @this {WebInspector.TempFile}
         */
        function didGetFile(file)
        {
            var reader = new FileReader();

            /**
             * @this {FileReader}
             */
            reader.onloadend = function(e)
            {
                callback(/** @type {?string} */ (this.result));
            }
            reader.onerror = function(error)
            {
                WebInspector.log("Failed to read from temp file: " + error.message,
                                 WebInspector.ConsoleMessage.MessageLevel.Error);
            }
            reader.readAsText(file);
        }
        function didFailToGetFile(error)
        {
            WebInspector.log("Failed to load temp file: " + error.message,
                              WebInspector.ConsoleMessage.MessageLevel.Error);
            callback(null);
        }
        this._fileEntry.file(didGetFile.bind(this), didFailToGetFile.bind(this));
    },

    /**
     * @param {!function(?File)} callback
     */
    getFile: function(callback)
    {
        function didFailToGetFile(error)
        {
            WebInspector.log("Failed to load temp file: " + error.message,
                              WebInspector.ConsoleMessage.MessageLevel.Error);
            callback(null);
        }
        this._fileEntry.file(callback, didFailToGetFile.bind(this));
    }
}

/**
 * @constructor
 * @param {!string} dirPath
 * @param {!string} name
 */
WebInspector.BufferedTempFileWriter = function(dirPath, name)
{
    this._chunks = [];
    this._tempFile = null;
    this._isWriting = false;
    this._finishCallback = null;
    this._isFinished = false;
    new WebInspector.TempFile(dirPath, name, this._didCreateTempFile.bind(this));
}

WebInspector.BufferedTempFileWriter.prototype = {
    /**
     * @param {!string} data
     */
    write: function(data)
    {
        if (!this._chunks)
            return;
        if (this._finishCallback)
            throw new Error("Now writes are allowed after close.");
        this._chunks.push(data);
        if (this._tempFile && !this._isWriting)
            this._writeNextChunk();
    },

    /**
     * @param {!function(?WebInspector.TempFile)} callback
     */
    close: function(callback)
    {
        this._finishCallback = callback;
        if (this._isFinished)
            callback(this._tempFile);
    },

    _didCreateTempFile: function(tempFile)
    {
        this._tempFile = tempFile;
        if (!tempFile) {
            this._chunks = null;
            this._notifyFinished();
            return;
        }
        if (this._chunks.length)
            this._writeNextChunk();
    },

    _writeNextChunk: function()
    {
        var chunk = this._chunks.shift();
        this._tempFile.write(chunk, this._didWriteChunk.bind(this));
        this._isWriting = true;
    },

    _didWriteChunk: function(success)
    {
        this._isWriting = false;
        if (!success) {
            this._tempFile = null;
            this._chunks = null;
            this._notifyFinished();
            return;
        }
        if (this._chunks.length)
            this._writeNextChunk();
        else if (this._finishCallback)
            this._notifyFinished();
    },

    _notifyFinished: function()
    {
        this._isFinished = true;
        if (this._tempFile)
            this._tempFile.finishWriting();
        if (this._finishCallback)
            this._finishCallback(this._tempFile);
    }
}
