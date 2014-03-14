/*
 * Copyright (C) 2014 Google Inc.  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

WebInspector.platform = function()
{
    if (!WebInspector._platform)
        WebInspector._platform = InspectorFrontendHost.platform();
    return WebInspector._platform;
}

WebInspector.isMac = function()
{
    if (typeof WebInspector._isMac === "undefined")
        WebInspector._isMac = WebInspector.platform() === "mac";

    return WebInspector._isMac;
}

WebInspector.isWin = function()
{
    if (typeof WebInspector._isWin === "undefined")
        WebInspector._isWin = WebInspector.platform() === "windows";

    return WebInspector._isWin;
}

WebInspector.PlatformFlavor = {
    WindowsVista: "windows-vista",
    MacTiger: "mac-tiger",
    MacLeopard: "mac-leopard",
    MacSnowLeopard: "mac-snowleopard",
    MacLion: "mac-lion"
}

WebInspector.platformFlavor = function()
{
    function detectFlavor()
    {
        const userAgent = navigator.userAgent;

        if (WebInspector.platform() === "windows") {
            var match = userAgent.match(/Windows NT (\d+)\.(?:\d+)/);
            if (match && match[1] >= 6)
                return WebInspector.PlatformFlavor.WindowsVista;
            return null;
        } else if (WebInspector.platform() === "mac") {
            var match = userAgent.match(/Mac OS X\s*(?:(\d+)_(\d+))?/);
            if (!match || match[1] != 10)
                return WebInspector.PlatformFlavor.MacSnowLeopard;
            switch (Number(match[2])) {
                case 4:
                    return WebInspector.PlatformFlavor.MacTiger;
                case 5:
                    return WebInspector.PlatformFlavor.MacLeopard;
                case 6:
                    return WebInspector.PlatformFlavor.MacSnowLeopard;
                case 7:
                    return WebInspector.PlatformFlavor.MacLion;
                case 8: // Matches the default version
                case 9: // Matches the default version
                default:
                    return "";
            }
        }
    }

    if (!WebInspector._platformFlavor)
        WebInspector._platformFlavor = detectFlavor();

    return WebInspector._platformFlavor;
}

WebInspector.port = function()
{
    if (!WebInspector._port)
        WebInspector._port = InspectorFrontendHost.port();

    return WebInspector._port;
}

/**
 * @return {string}
 */
WebInspector.fontFamily = function()
{
    if (WebInspector._fontFamily)
        return WebInspector._fontFamily;
    switch (WebInspector.platform()) {
    case "linux":
        WebInspector._fontFamily = "Ubuntu, Arial, sans-serif";
        break;
    case "mac":
        WebInspector._fontFamily = "'Lucida Grande', sans-serif";
        break;
    case "windows":
        WebInspector._fontFamily = "'Segoe UI', Tahoma, sans-serif";
        break;
    }
    return WebInspector._fontFamily;
}
