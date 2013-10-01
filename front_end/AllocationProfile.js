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

/**
 * @constructor
 */
WebInspector.AllocationProfile = function(profile)
{
    this._strings = profile.strings;

    this._nextNodeId = 1;
    this._idToFunctionInfo = {};
    this._idToNode = {};
    this._collapsedTopNodeIdToFunctionInfo = {};

    this._traceTops = null;

    this._buildAllocationFunctionInfos(profile.trace_function_infos);
    this._traceTree = this._buildInvertedAllocationTree(profile.trace_tree);
}

WebInspector.AllocationProfile.prototype = {
    _buildAllocationFunctionInfos: function(rawInfos)
    {
        var strings = this._strings;
        var functionIdOffset = 0;
        var functionNameOffset = 1;
        var scriptNameOffset = 2;
        var functionInfoFieldCount = 3;

        var map = this._idToFunctionInfo;

        // Special case for the root node.
        map[0] = new WebInspector.FunctionAllocationInfo("(root)", "<unknown>");

        var infoLength = rawInfos.length;
        for (var i = 0; i < infoLength; i += functionInfoFieldCount) {
            map[rawInfos[i + functionIdOffset]] = new WebInspector.FunctionAllocationInfo(
                strings[rawInfos[i + functionNameOffset]],
                strings[rawInfos[i + scriptNameOffset]]);
        }

    },

    _buildInvertedAllocationTree: function(traceTreeRaw)
    {
        var idToFunctionInfo = this._idToFunctionInfo;
        var nodeIdOffset = 0;
        var functionIdOffset = 1;
        var allocationCountOffset = 2;
        var allocationSizeOffset = 3;
        var childrenOffset = 4;
        var nodeFieldCount = 5;

        function traverseNode(rawNodeArray, nodeOffset, parent)
        {
            var functionInfo = idToFunctionInfo[rawNodeArray[nodeOffset + functionIdOffset]];
            var result = new WebInspector.AllocationTraceNode(
                rawNodeArray[nodeOffset + nodeIdOffset],
                functionInfo,
                rawNodeArray[nodeOffset + allocationCountOffset],
                rawNodeArray[nodeOffset + allocationSizeOffset],
                parent);
            functionInfo.addTraceTopNode(result);

            var rawChildren = rawNodeArray[nodeOffset + childrenOffset];
            for (var i = 0; i < rawChildren.length; i += nodeFieldCount) {
                result.children.push(traverseNode(rawChildren, i, result));
            }
            return result;
        }

        return traverseNode(traceTreeRaw, 0, null);
    },

    serializeTraceTops: function()
    {
        if (this._traceTops)
            return this._traceTops;
        var result = this._traceTops = [];
        var idToFunctionInfo = this._idToFunctionInfo;
        for (var id in idToFunctionInfo) {
            var info = idToFunctionInfo[id];
            if (info.totalCount === 0)
                continue;
            var nodeId = this._nextNodeId++;
            result.push(this._serializeNode(
                nodeId,
                info.functionName,
                info.totalCount,
                info.totalSize,
                true));
            this._collapsedTopNodeIdToFunctionInfo[nodeId] = info;
        }
        result.sort(function(a, b) {
            return b.size - a.size;
        });
        return result;
    },

    serializeCallers: function(nodeId)
    {
        var node = this._idToNode[nodeId];
        if (!node) {
            var functionInfo = this._collapsedTopNodeIdToFunctionInfo[nodeId];
            node = functionInfo.tracesWithThisTop();
            delete this._collapsedTopNodeIdToFunctionInfo[nodeId];
            this._idToNode[nodeId] = node;
        }
        var result = [];
        var callers = node.callers();
        for (var i = 0; i < callers.length; i++) {
            var callerNode = callers[i];
            var callerId = this._nextNodeId++;
            this._idToNode[callerId] = callerNode;
            result.push(this._serializeNode(
                callerId,
                callerNode.functionInfo.functionName,
                callerNode.allocationCount,
                callerNode.allocationSize,
                callerNode.hasCallers()));
        }
        return result;
    },

    _serializeNode: function(nodeId, functionName, count, size, hasChildren)
    {
        return {
            id: nodeId,
            name: functionName,
            count: count,
            size: size,
            hasChildren: hasChildren
        };
    }
}


/**
 * @constructor
 */
WebInspector.AllocationTraceNode = function(id, functionInfo, count, size, parent)
{
    this.id = id;
    this.functionInfo = functionInfo;
    this.allocationCount = count;
    this.allocationSize = size;
    this.parent = parent;
    this.children = [];
}


/**
 * @constructor
 * @param {WebInspector.FunctionAllocationInfo} functionInfo
 */
WebInspector.AllocationBackTraceNode = function(functionInfo)
{
    this.functionInfo = functionInfo;
    this.allocationCount = 0;
    this.allocationSize = 0;
    this._callers = [];
}


WebInspector.AllocationBackTraceNode.prototype = {
    /**
     * @param {WebInspector.AllocationTraceNode} traceNode
     * @return {WebInspector.AllocationTraceNode}
     */
    addCaller: function(traceNode)
    {
        var functionInfo = traceNode.functionInfo;
        var result;
        for (var i = 0; i < this._callers.length; i++) {
            var caller = this._callers[i];
            if (caller.functionInfo === functionInfo) {
                result = caller;
                break;
            }
        }
        if (!result) {
            result = new WebInspector.AllocationBackTraceNode(functionInfo);
            this._callers.push(result);
        }
        return result;
    },

    callers: function()
    {
        return this._callers;
    },

    hasCallers: function()
    {
        return this._callers.length > 0;
    }
}


/**
 * @constructor
 */
WebInspector.FunctionAllocationInfo = function(functionName, scriptName)
{
    this.functionName = functionName;
    this.scriptName = scriptName;
    this.totalCount = 0;
    this.totalSize = 0;
    this._traceTops = [];
}

WebInspector.FunctionAllocationInfo.prototype = {
    addTraceTopNode: function(node)
    {
        if (node.allocationCount === 0)
            return;
        this._traceTops.push(node);
        this.totalCount += node.allocationCount;
        this.totalSize += node.allocationSize;
    },

    tracesWithThisTop: function()
    {
        if (!this._traceTops.length)
            return null;
        if (!this._backTraceTree)
            this._buildAllocationTraceTree();
        return this._backTraceTree;
    },

    _buildAllocationTraceTree: function()
    {
        this._backTraceTree = new WebInspector.AllocationBackTraceNode(this._traceTops[0].functionInfo);

        for (var i = 0; i < this._traceTops.length; i++) {
            var node = this._traceTops[i];
            var backTraceNode = this._backTraceTree;
            var count = node.allocationCount;
            var size = node.allocationSize;
            while (true) {
                backTraceNode.allocationCount += count;
                backTraceNode.allocationSize += size;
                node = node.parent;
                if (node === null) {
                    break;
                }
                backTraceNode = backTraceNode.addCaller(node);
            }
        }
    }
}
