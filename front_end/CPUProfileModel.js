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
    this.startTime = profile.startTime * 1000;
    this.endTime = profile.endTime * 1000;
    this._calculateTimes(profile);
    this._assignParentsInProfile();
    if (this.samples)
        this._buildIdToNodeMap();
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

        var duration = this.endTime - this.startTime;
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
        for (var i = 0; i < topLevelNodes.length; i++) {
            var node = topLevelNodes[i];
            if (node.functionName === "(garbage collector)") {
                this._gcNode = node;
                break;
            }
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
        var idToNode = this._idToNode;
        var gcNode = this._gcNode;
        var samplesCount = samples.length;
        var samplingInterval = this.samplingInterval;

        var openIntervals = [];
        var stackTrace = [];
        var depth = 0;
        var currentInterval;
        var startIndex = Math.ceil(startTime / samplingInterval);

        for (var sampleIndex = startIndex; sampleIndex < samplesCount; sampleIndex++) {
            var sampleTime = sampleIndex * samplingInterval;
            if (sampleTime >= stopTime)
                break;

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


/**
 * @constructor
 * @implements {WebInspector.FlameChartDataProvider}
 * @param {!WebInspector.CPUProfileDataModel} cpuProfile
 * @param {!WebInspector.Target} target
 */
WebInspector.CPUFlameChartDataProvider = function(cpuProfile, target)
{
    WebInspector.FlameChartDataProvider.call(this);
    this._cpuProfile = cpuProfile;
    this._target = target;
    this._colorGenerator = WebInspector.CPUFlameChartDataProvider.colorGenerator();
}

WebInspector.CPUFlameChartDataProvider.prototype = {
    /**
     * @return {number}
     */
    barHeight: function()
    {
        return 15;
    },

    /**
     * @return {number}
     */
    textBaseline: function()
    {
        return 4;
    },

    /**
     * @return {number}
     */
    textPadding: function()
    {
        return 2;
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @return {?Array.<number>}
     */
    dividerOffsets: function(startTime, endTime)
    {
        return null;
    },

    /**
     * @return {number}
     */
    zeroTime: function()
    {
        return 0;
    },

    /**
     * @return {number}
     */
    totalTime: function()
    {
        return this._cpuProfile.profileHead.totalTime;
    },

    /**
     * @return {number}
     */
    maxStackDepth: function()
    {
        return this._maxStackDepth;
    },

    /**
     * @return {?WebInspector.FlameChart.TimelineData}
     */
    timelineData: function()
    {
        return this._timelineData || this._calculateTimelineData();
    },

    /**
     * @return {?WebInspector.FlameChart.TimelineData}
     */
    _calculateTimelineData: function()
    {
        /**
         * @constructor
         * @param {number} depth
         * @param {number} duration
         * @param {number} startTime
         * @param {!Object} node
         */
        function ChartEntry(depth, duration, startTime, selfTime, node)
        {
            this.depth = depth;
            this.duration = duration;
            this.startTime = startTime;
            this.node = node;
            this.selfTime = selfTime;
        }

        /** @type {!Array.<?ChartEntry>} */
        var entries = [];
        /** @type {!Array.<number>} */
        var stack = [];
        var maxDepth = 5;

        function onOpenFrame()
        {
            stack.push(entries.length);
            // Reserve space for the entry, as they have to be ordered by startTime.
            // The entry itself will be put there in onCloseFrame.
            entries.push(null);
        }
        function onCloseFrame(depth, node, startTime, totalTime, selfTime)
        {
            var index = stack.pop();
            entries[index] = new ChartEntry(depth, totalTime, startTime, selfTime, node);
            maxDepth = Math.max(maxDepth, depth);
        }
        this._cpuProfile.forEachFrame(onOpenFrame, onCloseFrame);

        /** @type {!Array.<!ProfilerAgent.CPUProfileNode>} */
        var entryNodes = new Array(entries.length);
        var entryLevels = new Uint8Array(entries.length);
        var entryTotalTimes = new Float32Array(entries.length);
        var entrySelfTimes = new Float32Array(entries.length);
        var entryOffsets = new Float32Array(entries.length);

        for (var i = 0; i < entries.length; ++i) {
            var entry = entries[i];
            entryNodes[i] = entry.node;
            entryLevels[i] = entry.depth;
            entryTotalTimes[i] = entry.duration;
            entryOffsets[i] = entry.startTime;
            entrySelfTimes[i] = entry.selfTime;
        }

        this._maxStackDepth = maxDepth;

        /** @type {!WebInspector.FlameChart.TimelineData} */
        this._timelineData = {
            entryLevels: entryLevels,
            entryTotalTimes: entryTotalTimes,
            entryOffsets: entryOffsets,
        };

        /** @type {!Array.<!ProfilerAgent.CPUProfileNode>} */
        this._entryNodes = entryNodes;
        this._entrySelfTimes = entrySelfTimes;

        return this._timelineData;
    },

    /**
     * @param {number} ms
     * @return {string}
     */
    _millisecondsToString: function(ms)
    {
        if (ms === 0)
            return "0";
        if (ms < 1000)
            return WebInspector.UIString("%.1f\u2009ms", ms);
        return Number.secondsToString(ms / 1000, true);
    },

    /**
     * @param {number} entryIndex
     * @return {?Array.<!{title: string, text: string}>}
     */
    prepareHighlightedEntryInfo: function(entryIndex)
    {
        var timelineData = this._timelineData;
        var node = this._entryNodes[entryIndex];
        if (!node)
            return null;

        var entryInfo = [];
        function pushEntryInfoRow(title, text)
        {
            var row = {};
            row.title = title;
            row.text = text;
            entryInfo.push(row);
        }

        pushEntryInfoRow(WebInspector.UIString("Name"), node.functionName);
        var selfTime = this._millisecondsToString(this._entrySelfTimes[entryIndex]);
        var totalTime = this._millisecondsToString(timelineData.entryTotalTimes[entryIndex]);
        pushEntryInfoRow(WebInspector.UIString("Self time"), selfTime);
        pushEntryInfoRow(WebInspector.UIString("Total time"), totalTime);
        var target = this._target;
        var text = WebInspector.Linkifier.liveLocationText(target, node.scriptId, node.lineNumber, node.columnNumber);
        pushEntryInfoRow(WebInspector.UIString("URL"), text);
        pushEntryInfoRow(WebInspector.UIString("Aggregated self time"), Number.secondsToString(node.selfTime / 1000, true));
        pushEntryInfoRow(WebInspector.UIString("Aggregated total time"), Number.secondsToString(node.totalTime / 1000, true));
        if (node.deoptReason && node.deoptReason !== "no reason")
            pushEntryInfoRow(WebInspector.UIString("Not optimized"), node.deoptReason);

        return entryInfo;
    },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    canJumpToEntry: function(entryIndex)
    {
        return this._entryNodes[entryIndex].scriptId !== "0";
    },

    /**
     * @param {number} entryIndex
     * @return {?string}
     */
    entryTitle: function(entryIndex)
    {
        var node = this._entryNodes[entryIndex];
        return node.functionName;
    },

    /**
     * @param {number} entryIndex
     * @return {?string}
     */
    entryFont: function(entryIndex)
    {
        if (!this._font) {
            this._font = (this.barHeight() - 4) + "px " + WebInspector.fontFamily();
            this._boldFont = "bold " + this._font;
        }
        var node = this._entryNodes[entryIndex];
        var reason = node.deoptReason;
        return (reason && reason !== "no reason") ? this._boldFont : this._font;
    },

    /**
     * @param {number} entryIndex
     * @return {!string}
     */
    entryColor: function(entryIndex)
    {
        var node = this._entryNodes[entryIndex];
        return this._colorGenerator.colorForID(node.functionName + ":" + node.url + ":" + node.lineNumber);
    },

    /**
     * @param {number} entryIndex
     * @param {!CanvasRenderingContext2D} context
     * @param {?string} text
     * @param {number} barX
     * @param {number} barY
     * @param {number} barWidth
     * @param {number} barHeight
     * @param {function(number):number} offsetToPosition
     * @return {boolean}
     */
    decorateEntry: function(entryIndex, context, text, barX, barY, barWidth, barHeight, offsetToPosition)
    {
        return false;
    },

    /**
     * @param {number} entryIndex
     * @return {boolean}
     */
    forceDecoration: function(entryIndex)
    {
        return false;
    },

    /**
     * @param {number} entryIndex
     * @return {!{startTimeOffset: number, endTimeOffset: number}}
     */
    highlightTimeRange: function(entryIndex)
    {
        var startTimeOffset = this._timelineData.entryOffsets[entryIndex];
        return {
            startTimeOffset: startTimeOffset,
            endTimeOffset: startTimeOffset + this._timelineData.entryTotalTimes[entryIndex]
        };
    },

    /**
     * @return {number}
     */
    paddingLeft: function()
    {
        return 15;
    },

    /**
     * @param {number} entryIndex
     * @return {!string}
     */
    textColor: function(entryIndex)
    {
        return "#333";
    }
}


/**
 * @return {!WebInspector.FlameChart.ColorGenerator}
 */
WebInspector.CPUFlameChartDataProvider.colorGenerator = function()
{
    if (!WebInspector.CPUFlameChartDataProvider._colorGenerator) {
        var colorGenerator = new WebInspector.FlameChart.ColorGenerator();
        colorGenerator.setColorForID("(idle)::0", "hsl(0, 0%, 80%)");
        colorGenerator.setColorForID("(program)::0", "hsl(0, 0%, 80%)");
        colorGenerator.setColorForID("(garbage collector)::0", "hsl(0, 0%, 80%)");
        WebInspector.CPUFlameChartDataProvider._colorGenerator = colorGenerator;
    }
    return WebInspector.CPUFlameChartDataProvider._colorGenerator;
}
