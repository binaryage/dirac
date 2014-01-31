#!/usr/bin/env python
# Copyright (c) 2014 Google Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#     * Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above
# copyright notice, this list of conditions and the following disclaimer
# in the documentation and/or other materials provided with the
# distribution.
#     * Neither the name of Google Inc. nor the names of its
# contributors may be used to endorse or promote products derived from
# this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

try:
    import simplejson as json
except ImportError:
    import json

import sys

cssProperties = {}


def filterCommentsAndEmptyLines(lines):
    result = []
    for line in lines:
        if len(line.strip()) > 0 and line[:2] != "//":
            result.append(line.strip())
    return result


def fillPropertiesFromFile(fileName):
    with open(fileName, "r") as f:
        lines = f.readlines()
    lines = filterCommentsAndEmptyLines(lines)
    for line in lines:
        if not "alias_for" in line:
            cssProperties[line] = []


def fillCSSShorthandsFromFile(fileName):
    with open(fileName, "r") as f:
        lines = f.readlines()
    lines = filterCommentsAndEmptyLines(lines)
    for line in lines:
        # Every line is:
        #  <property-name>[ longhands=<longhand 1>;<longhand 2>;<longhand 3>,runtimeEnabledShorthand=<runtime flag name>]
        # There might be a runtime flag declaration at the end of the list followed by a comma.
        if "," in line:
            line = line[:line.index(",")]
        shorthand = line[:line.index(" ")]
        longhands = line[line.index("=") + 1:].split(";")
        cssProperties[shorthand] = longhands

fillPropertiesFromFile(sys.argv[1])
fillPropertiesFromFile(sys.argv[2])
fillCSSShorthandsFromFile(sys.argv[3])

# Reformat from map into list.
reformat = []
for name, longhands in cssProperties.items():
    entry = {"name": name}
    if len(longhands) > 0:
        entry["longhands"] = longhands
    reformat.append(entry)

with open(sys.argv[4], "w") as f:
    f.write("WebInspector.CSSMetadata.initializeWithSupportedProperties(%s);" % json.dumps(reformat))
