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

        var durationMs = 1000 * (profile.endTime - profile.startTime);
        var samplingInterval = durationMs / profile.totalHitCount;
        this.samplingIntervalMs = samplingInterval;

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
        if (!this._cpuProfile.profileHead)
            return null;

        var samples = this._cpuProfile.samples;
        var idToNode = this._cpuProfile._idToNode;
        var gcNode = this._cpuProfile._gcNode;
        var samplesCount = samples.length;
        var samplingInterval = this._cpuProfile.samplingIntervalMs;

        var index = 0;

        var openIntervals = [];
        var stackTrace = [];
        var maxDepth = 5; // minimum stack depth for the case when we see no activity.
        var depth = 0;

        /**
         * @constructor
         * @param {number} depth
         * @param {number} duration
         * @param {number} startTime
         * @param {!Object} node
         */
        function ChartEntry(depth, duration, startTime, node)
        {
            this.depth = depth;
            this.duration = duration;
            this.startTime = startTime;
            this.node = node;
            this.selfTime = 0;
        }
        var entries = /** @type {!Array.<!ChartEntry>} */ ([]);

        for (var sampleIndex = 0; sampleIndex < samplesCount; sampleIndex++) {
            var node = idToNode[samples[sampleIndex]];
            stackTrace.length = 0;
            while (node) {
                stackTrace.push(node);
                node = node.parent;
            }
            stackTrace.pop(); // Remove (root) node

            maxDepth = Math.max(maxDepth, depth);
            depth = 0;
            node = stackTrace.pop();
            var intervalIndex;

            // GC samples have no stack, so we just put GC node on top of the last recoreded sample.
            if (node === gcNode) {
                while (depth < openIntervals.length) {
                    intervalIndex = openIntervals[depth].index;
                    entries[intervalIndex].duration += samplingInterval;
                    ++depth;
                }
                // If previous stack is also GC then just continue.
                if (openIntervals.length > 0 && openIntervals.peekLast().node === node) {
                    entries[intervalIndex].selfTime += samplingInterval;
                    continue;
                }
            }

            while (node && depth < openIntervals.length && node === openIntervals[depth].node) {
                intervalIndex = openIntervals[depth].index;
                entries[intervalIndex].duration += samplingInterval;
                node = stackTrace.pop();
                ++depth;
            }
            if (depth < openIntervals.length)
                openIntervals.length = depth;
            if (!node) {
                entries[intervalIndex].selfTime += samplingInterval;
                continue;
            }

            var colorGenerator = this._colorGenerator;
            var color = "";
            while (node) {
                entries.push(new ChartEntry(depth, samplingInterval, sampleIndex * samplingInterval, node));
                openIntervals.push({node: node, index: index});
                ++index;

                node = stackTrace.pop();
                ++depth;
            }
            entries[entries.length - 1].selfTime += samplingInterval;
        }

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

        this._maxStackDepth = Math.max(maxDepth, depth);

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
 * @return {!WebInspector.CPUFlameChartDataProvider.ColorGenerator}
 */
WebInspector.CPUFlameChartDataProvider.colorGenerator = function()
{
    if (!WebInspector.CPUFlameChartDataProvider._colorGenerator) {
        var colorGenerator = new WebInspector.CPUFlameChartDataProvider.ColorGenerator();
        colorGenerator.colorForID("(idle)::0", 40);
        colorGenerator.colorForID("(program)::0", 40);
        colorGenerator.colorForID("(garbage collector)::0", 40);
        WebInspector.CPUFlameChartDataProvider._colorGenerator = colorGenerator;
    }
    return WebInspector.CPUFlameChartDataProvider._colorGenerator;
}


/**
 * @constructor
 */
WebInspector.CPUFlameChartDataProvider.ColorGenerator = function()
{
    this._colors = {};
    this._currentColorIndex = 0;
}

WebInspector.CPUFlameChartDataProvider.ColorGenerator.prototype = {
    /**
     * @param {string} id
     * @param {string|!CanvasGradient} color
     */
    setColorForID: function(id, color)
    {
        this._colors[id] = color;
    },

    /**
     * @param {!string} id
     * @param {number=} sat
     * @return {!string}
     */
    colorForID: function(id, sat)
    {
        if (typeof sat !== "number")
            sat = 67;
        var color = this._colors[id];
        if (!color) {
            color = this._createColor(this._currentColorIndex++, sat);
            this._colors[id] = color;
        }
        return color;
    },

    /**
     * @param {!number} index
     * @param {!number} sat
     */
    _createColor: function(index, sat)
    {
        var hue = (index * 20) % 360;
        return "hsl(" + hue + ", " + sat + "%, 80%)";
    }
}
