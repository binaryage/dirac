/*
 * Copyright 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

/**
 * @param {string} message
 * @param {string} url
 * @param {number} lineNumber
 * @param {number} columnNumber
 * @param {!*} exception
 */
window.onerror = function(message, url, lineNumber, columnNumber, exception)
{
    if (!window.WebInspector && window.WebInspector.console)
        return;
    // Dump uncaught exception into devtools own console.
    // The file is including into the build only when debug_devtools=1 build flag has been specified.
    if (exception && exception.stack)
        WebInspector.console.log(exception.stack);
    else
        WebInspector.console.log(message + " at " + url + ":" + lineNumber + ":" + columnNumber);
}
