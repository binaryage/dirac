// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @return {!WebInspector.Lock}
 */
WebInspector.profilingLock = function()
{
    if (!WebInspector._profilingLock)
        WebInspector._profilingLock = new WebInspector.Lock();
    return WebInspector._profilingLock;
}
