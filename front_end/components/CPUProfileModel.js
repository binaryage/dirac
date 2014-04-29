// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.


/**
 * @constructor
 * @param {!ProfilerAgent.CPUProfile} profile
 */
WebInspector.CPUProfileDataModel = function(profile)
{
    this.profileHead = profile.head;
    this.samples = profile.samples;
    this.timestamps = profile.timestamps;
    this.profileStartTime = profile.startTime * 1000;
    this.profileEndTime = profile.endTime * 1000;
    if (this.samples) {
        this._normalizeSamples();
        this._buildIdToNodeMap();
        this._fixMissingSamples();
    }
    this._calculateTimes(profile);
    this._assignParentsInProfile();
}

WebInspector.CPUProfileDataModel.prototype = {
    /**
     * @param {!ProfilerAgent.CPUProfile} profile
     */
    _calculateTimes: function(profile)
    {
        function totalHitCount(node) {
            var result = node.hitCount;
            for (var i = 0; i < node.children.length; i++)
                result += totalHitCount(node.children[i]);
            return result;
        }
        profile.totalHitCount = totalHitCount(profile.head);

        var duration = this.profileEndTime - this.profileStartTime;
        var samplingInterval = duration / profile.totalHitCount;
        this.samplingInterval = samplingInterval;

        function calculateTimesForNode(node) {
            node.selfTime = node.hitCount * samplingInterval;
            var totalHitCount = node.hitCount;
            for (var i = 0; i < node.children.length; i++)
                totalHitCount += calculateTimesForNode(node.children[i]);
            node.totalTime = totalHitCount * samplingInterval;
            return totalHitCount;
        }
        calculateTimesForNode(profile.head);
    },

    _assignParentsInProfile: function()
    {
        var head = this.profileHead;
        head.parent = null;
        head.head = null;
        var nodesToTraverse = [ head ];
        while (nodesToTraverse.length) {
            var parent = nodesToTraverse.pop();
            var children = parent.children;
            var length = children.length;
            for (var i = 0; i < length; ++i) {
                var child = children[i];
                child.head = head;
                child.parent = parent;
                if (child.children.length)
                    nodesToTraverse.push(child);
            }
        }
    },

    _normalizeSamples: function()
    {
        var timestamps = this.timestamps;
        // Convert samples from usec to msec
        for (var i = 0; i < timestamps.length; ++i)
            timestamps[i] /= 1000;
        var averageSample = (timestamps.peekLast() - timestamps[0]) / (timestamps.length - 1);
        // Add an extra timestamp used to calculate the last sample duration.
        this.timestamps.push(timestamps.peekLast() + averageSample);
        this.profileStartTime = timestamps[0];
        this.profileEndTime = timestamps.peekLast();
    },

    _buildIdToNodeMap: function()
    {
        /** @type {!Object.<number, !ProfilerAgent.CPUProfileNode>} */
        this._idToNode = {};
        var idToNode = this._idToNode;
        var stack = [this.profileHead];
        while (stack.length) {
            var node = stack.pop();
            idToNode[node.id] = node;
            for (var i = 0; i < node.children.length; i++)
                stack.push(node.children[i]);
        }

        var topLevelNodes = this.profileHead.children;
        for (var i = 0; i < topLevelNodes.length && !(this.gcNode && this.programNode && this.idleNode); i++) {
            var node = topLevelNodes[i];
            if (node.functionName === "(garbage collector)")
                this.gcNode = node;
            else if (node.functionName === "(program)")
                this.programNode = node;
            else if (node.functionName === "(idle)")
                this.idleNode = node;
        }
    },

    _fixMissingSamples: function()
    {
        // Sometimes sampler is not able to parse the JS stack and returns
        // a (program) sample instead. The issue leads to call frames belong
        // to the same function invocation being split apart.
        // Here's a workaround for that. When there's a single (program) sample
        // between two call stacks sharing the same bottom node, it is replaced
        // with the preceeding sample.
        var samples = this.samples;
        var samplesCount = samples.length;
        if (!this.programNode || samplesCount < 3)
            return;
        var idToNode = this._idToNode;
        var programNodeId = this.programNode.id;
        var gcNodeId = this.gcNode ? this.gcNode.id : -1;
        var idleNodeId = this.idleNode ? this.idleNode.id : -1;
        var prevNodeId = samples[0];
        var nodeId = samples[1];
        for (var sampleIndex = 1; sampleIndex < samplesCount - 1; sampleIndex++) {
            var nextNodeId = samples[sampleIndex + 1];
            if (nodeId === programNodeId && !isSystemNode(prevNodeId) && !isSystemNode(nextNodeId)
                && bottomNode(idToNode[prevNodeId]) === bottomNode(idToNode[nextNodeId])) {
                samples[sampleIndex] = prevNodeId;
            }
            prevNodeId = nodeId;
            nodeId = nextNodeId;
        }

        /**
         * @param {!ProfilerAgent.CPUProfileNode} node
         * @return {!ProfilerAgent.CPUProfileNode}
         */
        function bottomNode(node)
        {
            while (node.parent)
                node = node.parent;
            return node;
        }

        /**
         * @param {number} nodeId
         * @return {boolean}
         */
        function isSystemNode(nodeId)
        {
            return nodeId === programNodeId || nodeId === gcNodeId || nodeId === idleNodeId;
        }
    },

    /**
     * @param {function(number, !ProfilerAgent.CPUProfileNode, number)} openFrameCallback
     * @param {function(number, !ProfilerAgent.CPUProfileNode, number, number, number)} closeFrameCallback
     * @param {number=} startTime
     * @param {number=} stopTime
     */
    forEachFrame: function(openFrameCallback, closeFrameCallback, startTime, stopTime)
    {
        if (!this.profileHead)
            return;

        startTime = startTime || 0;
        stopTime = stopTime || Infinity;
        var samples = this.samples;
        var timestamps = this.timestamps;
        var idToNode = this._idToNode;
        var gcNode = this.gcNode;
        var samplesCount = samples.length;

        var openIntervals = [];
        var stackTrace = [];
        var depth = 0;
        var currentInterval;
        var startIndex = timestamps.lowerBound(startTime);

        for (var sampleIndex = startIndex; sampleIndex < samplesCount; sampleIndex++) {
            var sampleTime = timestamps[sampleIndex];
            if (sampleTime >= stopTime)
                break;
            var samplingInterval = timestamps[sampleIndex + 1] - sampleTime;

            stackTrace.length = 0;
            for (var node = idToNode[samples[sampleIndex]]; node.parent; node = node.parent)
                stackTrace.push(node);

            depth = 0;
            node = stackTrace.pop();

            // GC samples have no stack, so we just put GC node on top of the last recoreded sample.
            if (node === gcNode) {
                while (depth < openIntervals.length) {
                    currentInterval = openIntervals[depth];
                    currentInterval.duration += samplingInterval;
                    ++depth;
                }
                // If previous stack is also GC then just continue.
                if (openIntervals.length > 0 && openIntervals.peekLast().node === node) {
                    currentInterval.selfTime += samplingInterval;
                    continue;
                }
            }

            while (node && depth < openIntervals.length && node === openIntervals[depth].node) {
                currentInterval = openIntervals[depth];
                currentInterval.duration += samplingInterval;
                node = stackTrace.pop();
                ++depth;
            }
            while (openIntervals.length > depth) {
                currentInterval = openIntervals.pop();
                closeFrameCallback(openIntervals.length, currentInterval.node, currentInterval.startTime, currentInterval.duration, currentInterval.selfTime);
            }
            if (!node) {
                currentInterval.selfTime += samplingInterval;
                continue;
            }
            while (node) {
                openIntervals.push({node: node, depth: depth, duration: samplingInterval, startTime: sampleTime, selfTime: 0});
                openFrameCallback(depth, node, sampleTime);
                node = stackTrace.pop();
                ++depth;
            }
            openIntervals.peekLast().selfTime += samplingInterval;
        }

        while (openIntervals.length) {
            currentInterval = openIntervals.pop();
            closeFrameCallback(openIntervals.length, currentInterval.node, currentInterval.startTime, currentInterval.duration, currentInterval.selfTime);
        }
    }
}
