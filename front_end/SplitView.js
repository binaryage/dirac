/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 * 1. Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GOOGLE INC. AND ITS CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GOOGLE INC.
 * OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.View}
 * @param {boolean} isVertical
 * @param {boolean} secondIsSidebar
 * @param {string=} settingName
 * @param {number=} defaultSidebarWidth
 * @param {number=} defaultSidebarHeight
 * @param {boolean=} useDip
 */
WebInspector.SplitView = function(isVertical, secondIsSidebar, settingName, defaultSidebarWidth, defaultSidebarHeight, useDip)
{
    WebInspector.View.call(this);

    this.registerRequiredCSS("splitView.css");
    this.element.classList.add("split-view");

    this._mainView = new WebInspector.View();
    this._mainView.makeLayoutBoundary();
    this._mainElement = this._mainView.element;
    this._mainElement.className = "split-view-contents scroll-target split-view-main vbox"; // Override

    this._sidebarView = new WebInspector.View();
    this._sidebarView.makeLayoutBoundary();
    this._sidebarElement = this._sidebarView.element;
    this._sidebarElement.className = "split-view-contents scroll-target split-view-sidebar vbox"; // Override

    this._resizerElement = this.element.createChild("div", "split-view-resizer");
    if (secondIsSidebar) {
        this._mainView.show(this.element);
        this._sidebarView.show(this.element);
    } else {
        this._sidebarView.show(this.element);
        this._mainView.show(this.element);
    }

    this._onDragStartBound = this._onDragStart.bind(this);
    this._resizerElements = [];

    this._resizable = true;
    this._useDip = !!useDip;

    this._savedSidebarWidth = defaultSidebarWidth || 200;
    this._savedSidebarHeight = defaultSidebarHeight || this._savedSidebarWidth;

    if (0 < this._savedSidebarWidth && this._savedSidebarWidth < 1 &&
        0 < this._savedSidebarHeight && this._savedSidebarHeight < 1)
        this._useFraction = true;

    this._settingName = settingName;

    this.setSecondIsSidebar(secondIsSidebar);

    this._innerSetVertical(isVertical);
    this._showMode = WebInspector.SplitView.ShowMode.Both;

    // Should be called after isVertical has the right value.
    this.installResizer(this._resizerElement);
}

/** @typedef {{showMode: string, size: number}} */
WebInspector.SplitView.SettingForOrientation;

WebInspector.SplitView.ShowMode = {
    Both: "Both",
    OnlyMain: "OnlyMain",
    OnlySidebar: "OnlySidebar"
}

WebInspector.SplitView.Events = {
    SidebarSizeChanged: "SidebarSizeChanged",
    ShowModeChanged: "ShowModeChanged"
}

WebInspector.SplitView.prototype = {
    /**
     * @return {boolean}
     */
    isVertical: function()
    {
        return this._isVertical;
    },

    /**
     * @param {boolean} isVertical
     */
    setVertical: function(isVertical)
    {
        if (this._isVertical === isVertical)
            return;

        this._innerSetVertical(isVertical);

        if (this.isShowing())
            this._updateLayout();

        for (var i = 0; i < this._resizerElements.length; ++i)
            this._resizerElements[i].style.setProperty("cursor", this._isVertical ? "ew-resize" : "ns-resize");
    },

    /**
     * @param {boolean} isVertical
     */
    _innerSetVertical: function(isVertical)
    {
        this.element.classList.remove(this._isVertical ? "hbox" : "vbox");
        this._isVertical = isVertical;
        this.element.classList.add(this._isVertical ? "hbox" : "vbox");
        delete this._resizerElementSize;
        this._sidebarSize = -1;
    },

    /**
     * @param {boolean=} animate
     */
    _updateLayout: function(animate)
    {
        delete this._totalSize; // Lazy update.
        this._innerSetSidebarSize(this._lastSidebarSize(), false, animate);
    },

    /**
     * @return {!Element}
     */
    mainElement: function()
    {
        return this._mainElement;
    },

    /**
     * @return {!Element}
     */
    sidebarElement: function()
    {
        return this._sidebarElement;
    },

    /**
     * @return {boolean}
     */
    isSidebarSecond: function()
    {
        return this._secondIsSidebar;
    },

    enableShowModeSaving: function()
    {
        this._shouldSaveShowMode = true;
        var savedShowMode = this._savedShowMode();
        switch (savedShowMode) {
        case WebInspector.SplitView.ShowMode.Both:
            this.showBoth();
            break;
        case WebInspector.SplitView.ShowMode.OnlyMain:
            this.hideSidebar();
            break;
        case WebInspector.SplitView.ShowMode.OnlySidebar:
            this.hideMain();
            break;
        }
    },

    /**
     * @return {string}
     */
    showMode: function()
    {
        return this._showMode;
    },

    /**
     * @param {boolean} secondIsSidebar
     */
    setSecondIsSidebar: function(secondIsSidebar)
    {
        this._mainElement.classList.toggle("split-view-contents-first", secondIsSidebar);
        this._mainElement.classList.toggle("split-view-contents-second", !secondIsSidebar);
        this._sidebarElement.classList.toggle("split-view-contents-first", !secondIsSidebar);
        this._sidebarElement.classList.toggle("split-view-contents-second", secondIsSidebar);

        // Make sure second is last in the children array.
        if (secondIsSidebar) {
            if (this._sidebarElement.parentElement && this._sidebarElement.nextSibling)
                this.element.appendChild(this._sidebarElement);
        } else {
            if (this._mainElement.parentElement && this._mainElement.nextSibling)
                this.element.appendChild(this._mainElement);
        }

        this._secondIsSidebar = secondIsSidebar;
    },

    /**
     * @return {?string}
     */
    sidebarSide: function()
    {
        if (this._isShowingOne)
            return null;
        return this._isVertical ?
            (this._secondIsSidebar ? "right" : "left") :
            (this._secondIsSidebar ? "bottom" : "top");
    },

    /**
     * @return {number}
     */
    desiredSidebarSize: function()
    {
        return this._lastSidebarSize();
    },

    /**
     * @return {!Element}
     */
    resizerElement: function()
    {
        return this._resizerElement;
    },

    /**
     * @param {boolean=} animate
     */
    hideMain: function(animate)
    {
        this._showOnly(this._sidebarView, this._mainView, animate);
        this._updateShowMode(WebInspector.SplitView.ShowMode.OnlySidebar);
    },

    /**
     * @param {boolean=} animate
     */
    hideSidebar: function(animate)
    {
        this._showOnly(this._mainView, this._sidebarView, animate);
        this._updateShowMode(WebInspector.SplitView.ShowMode.OnlyMain);
    },

    /**
     * @param {!WebInspector.View} sideToShow
     * @param {!WebInspector.View} sideToHide
     * @param {boolean=} animate
     */
    _showOnly: function(sideToShow, sideToHide, animate)
    {
        this._cancelAnimation();

        /**
         * @this {WebInspector.SplitView}
         */
        function callback()
        {
            sideToShow.show(this.element);
            sideToHide.detach();
            sideToShow.element.classList.add("maximized");
            sideToHide.element.classList.remove("maximized");
            this._removeAllLayoutProperties();
        }

        if (animate) {
            this._animate(true, callback.bind(this));
        } else {
            callback.call(this);
            this.doResize();
        }

        this._isShowingOne = true;
        this._sidebarSize = -1;
        this.setResizable(false);
    },

    _removeAllLayoutProperties: function()
    {
        this._sidebarElement.style.removeProperty("flexBasis");

        this._resizerElement.style.removeProperty("left");
        this._resizerElement.style.removeProperty("right");
        this._resizerElement.style.removeProperty("top");
        this._resizerElement.style.removeProperty("bottom");

        this._resizerElement.style.removeProperty("margin-left");
        this._resizerElement.style.removeProperty("margin-right");
        this._resizerElement.style.removeProperty("margin-top");
        this._resizerElement.style.removeProperty("margin-bottom");
    },

    /**
     * @param {boolean=} animate
     */
    showBoth: function(animate)
    {
        if (!this._isShowingOne)
            animate = false;

        this._cancelAnimation();
        this._mainElement.classList.remove("maximized");
        this._sidebarElement.classList.remove("maximized");

        this._mainView.show(this.element);
        this._sidebarView.show(this.element);
        // Order views in DOM properly.
        this.setSecondIsSidebar(this._secondIsSidebar);

        this._isShowingOne = false;
        this._sidebarSize = -1;
        this.setResizable(true);
        this._updateLayout(animate);
        this._updateShowMode(WebInspector.SplitView.ShowMode.Both);
    },

    /**
     * @param {boolean} resizable
     */
    setResizable: function(resizable)
    {
        this._resizable = resizable;
        this._resizerElement.classList.toggle("hidden", !resizable);
    },

    /**
     * @param {number} size
     */
    setSidebarSize: function(size)
    {
        this._innerSetSidebarSize(size);
        this._saveSetting();
    },

    /**
     * @return {number}
     */
    sidebarSize: function()
    {
        return Math.max(0, this._sidebarSize);
    },

    /**
     * @return {number}
     */
    totalSize: function()
    {
        if (!this._totalSize)
            this._totalSize = this._isVertical ? this.element.offsetWidth : this.element.offsetHeight;
        return this._totalSize;
    },

    /**
     * @param {string} showMode
     */
    _updateShowMode: function(showMode)
    {
        this._showMode = showMode;
        this._saveSetting();
        this._updateShowHideSidebarButton();
        this.dispatchEventToListeners(WebInspector.SplitView.Events.ShowModeChanged, showMode);
    },

    /**
     * @param {number} size
     * @param {boolean=} ignoreConstraints
     * @param {boolean=} animate
     */
    _innerSetSidebarSize: function(size, ignoreConstraints, animate)
    {
        if (this._isShowingOne) {
            this._sidebarSize = size;
            return;
        }

        if (!ignoreConstraints)
            size = this._applyConstraints(size);
        if (this._sidebarSize === size)
            return;

        if (size < 0) {
            // Never apply bad values, fix it upon onResize instead.
            return;
        }

        this._removeAllLayoutProperties();

        var sizeValue;
        if (this._useFraction)
            sizeValue = (size / this.totalSize()) * 100 + "%";
        else
            sizeValue = size + "px";

        this.sidebarElement().style.flexBasis = sizeValue;

        if (!this._resizerElementSize)
            this._resizerElementSize = this._isVertical ? this._resizerElement.offsetWidth : this._resizerElement.offsetHeight;

        // Position resizer.
        if (this._isVertical) {
            if (this._secondIsSidebar) {
                this._resizerElement.style.right = sizeValue;
                this._resizerElement.style.marginRight = -this._resizerElementSize / 2 + "px";
            } else {
                this._resizerElement.style.left = sizeValue;
                this._resizerElement.style.marginLeft = -this._resizerElementSize / 2 + "px";
            }
        } else {
            if (this._secondIsSidebar) {
                this._resizerElement.style.bottom = sizeValue;
                this._resizerElement.style.marginBottom = -this._resizerElementSize / 2 + "px";
            } else {
                this._resizerElement.style.top = sizeValue;
                this._resizerElement.style.marginTop = -this._resizerElementSize / 2 + "px";
            }
        }

        this._sidebarSize = size;

        if (animate) {
            this._animate(false);
        } else {
            // No need to recalculate this._sidebarSize and this._totalSize again.
            this.doResize();
            this.dispatchEventToListeners(WebInspector.SplitView.Events.SidebarSizeChanged, this.sidebarSize());
        }
    },

    /**
     * @param {boolean} reverse
     * @param {function()=} callback
     */
    _animate: function(reverse, callback)
    {
        var animationTime = 50;
        this._animationCallback = callback;

        var animatedMarginPropertyName;
        if (this._isVertical)
            animatedMarginPropertyName = this._secondIsSidebar ? "margin-right" : "margin-left";
        else
            animatedMarginPropertyName = this._secondIsSidebar ? "margin-bottom" : "margin-top";

        var marginFrom = reverse ? "0" : "-" + this._sidebarSize + "px";
        var marginTo = reverse ? "-" + this._sidebarSize + "px" : "0";

        // This order of things is important.
        // 1. Resize main element early and force layout.
        this.element.style.setProperty(animatedMarginPropertyName, marginFrom);
        if (!reverse) {
            suppressUnused(this._mainElement.offsetWidth);
            suppressUnused(this._sidebarElement.offsetWidth);
        }

        // 2. Issue onresize to the sidebar element, its size won't change.
        if (!reverse)
            this._sidebarView.doResize();

        // 3. Configure and run animation
        this.element.style.setProperty("transition", animatedMarginPropertyName + " " + animationTime + "ms linear");

        var boundAnimationFrame;
        var startTime;
        /**
         * @this {WebInspector.SplitView}
         */
        function animationFrame()
        {
            delete this._animationFrameHandle;

            if (!startTime) {
                // Kick animation on first frame.
                this.element.style.setProperty(animatedMarginPropertyName, marginTo);
                startTime = window.performance.now();
            } else if (window.performance.now() < startTime + animationTime) {
                // Process regular animation frame.
                this._mainView.doResize();
            } else {
                // Complete animation.
                this._cancelAnimation();
                this._mainView.doResize();
                this.dispatchEventToListeners(WebInspector.SplitView.Events.SidebarSizeChanged, this.sidebarSize());
                return;
            }
            this._animationFrameHandle = window.requestAnimationFrame(boundAnimationFrame);
        }
        boundAnimationFrame = animationFrame.bind(this);
        this._animationFrameHandle = window.requestAnimationFrame(boundAnimationFrame);
    },

    _cancelAnimation: function()
    {
        this.element.style.removeProperty("margin-top");
        this.element.style.removeProperty("margin-right");
        this.element.style.removeProperty("margin-bottom");
        this.element.style.removeProperty("margin-left");
        this.element.style.removeProperty("transition");

        if (this._animationFrameHandle) {
            window.cancelAnimationFrame(this._animationFrameHandle);
            delete this._animationFrameHandle;
        }
        if (this._animationCallback) {
            this._animationCallback();
            delete this._animationCallback;
        }
    },

    /**
     * @param {number=} minWidth
     * @param {number=} minHeight
     */
    setSidebarElementConstraints: function(minWidth, minHeight)
    {
        if (typeof minWidth === "number")
            this._minimumSidebarWidth = minWidth;
        if (typeof minHeight === "number")
            this._minimumSidebarHeight = minHeight;
    },

    /**
     * @param {number=} minWidth
     * @param {number=} minHeight
     */
    setMainElementConstraints: function(minWidth, minHeight)
    {
        if (typeof minWidth === "number")
            this._minimumMainWidth = minWidth;
        if (typeof minHeight === "number")
            this._minimumMainHeight = minHeight;
    },

    /**
     * @param {number} sidebarSize
     * @return {number}
     */
    _applyConstraints: function(sidebarSize)
    {
        var zoomFactor = this._useDip ? WebInspector.zoomManager.zoomFactor() : 1;
        const minPadding = 20;
        var totalSize = this.totalSize();
        var minimumSiderbarSizeContraint = this.isVertical() ? this._minimumSidebarWidth : this._minimumSidebarHeight;
        var from = minimumSiderbarSizeContraint || 0;
        var fromInPercents = false;
        if (from && from < 1) {
            fromInPercents = true;
            from = Math.round(totalSize * from);
        }
        if (typeof minimumSiderbarSizeContraint !== "number")
            from = Math.max(from, minPadding);
        if (!fromInPercents)
            from /= zoomFactor;

        var minimumMainSizeConstraint = this.isVertical() ? this._minimumMainWidth : this._minimumMainHeight;
        var minMainSize = minimumMainSizeConstraint || 0;
        var toInPercents = false;
        if (minMainSize && minMainSize < 1) {
            toInPercents = true;
            minMainSize = Math.round(totalSize * minMainSize);
        }
        if (typeof minimumMainSizeConstraint !== "number")
            minMainSize = Math.max(minMainSize, minPadding);
        if (!toInPercents)
            minMainSize /= zoomFactor;

        var to = totalSize - minMainSize;
        if (from <= to)
            return Number.constrain(sidebarSize, from, to);

        // Respect fixed constraints over percents. This will, for example, shrink
        // the sidebar to its minimum size when possible.
        if (!fromInPercents && !toInPercents)
            return -1;
        if (toInPercents && sidebarSize >= from && from < totalSize)
            return from;
        if (fromInPercents && sidebarSize <= to && to < totalSize)
            return to;

        return -1;
    },

    wasShown: function()
    {
        if (this._useDip)
            WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._onZoomChanged, this);
        this._updateLayout();
    },

    willHide: function()
    {
        if (this._useDip)
            WebInspector.zoomManager.removeEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._onZoomChanged, this);
    },

    onResize: function()
    {
        this._updateLayout();
    },

    /**
     * @param {!MouseEvent} event
     * @return {boolean}
     */
    _startResizerDragging: function(event)
    {
        if (!this._resizable)
            return false;

        this._saveSetting();
        this._dragOffset = (this._secondIsSidebar ? this.totalSize() - this._sidebarSize : this._sidebarSize) - (this._isVertical ? event.pageX : event.pageY);
        return true;
    },

    /**
     * @param {!MouseEvent} event
     */
    _resizerDragging: function(event)
    {
        var newOffset = (this._isVertical ? event.pageX : event.pageY) + this._dragOffset;
        var newSize = (this._secondIsSidebar ? this.totalSize() - newOffset : newOffset);
        this.setSidebarSize(newSize);
        event.preventDefault();
    },

    /**
     * @param {!MouseEvent} event
     */
    _endResizerDragging: function(event)
    {
        delete this._dragOffset;
        this._saveSetting();
    },

    hideDefaultResizer: function()
    {
        this.element.classList.add("split-view-no-resizer");
    },

    /**
     * @param {!Element} resizerElement
     */
    installResizer: function(resizerElement)
    {
        resizerElement.addEventListener("mousedown", this._onDragStartBound, false);
        resizerElement.style.setProperty("cursor", this._isVertical ? "ew-resize" : "ns-resize");
        if (this._resizerElements.indexOf(resizerElement) === -1)
            this._resizerElements.push(resizerElement);
    },

    /**
     * @param {!Element} resizerElement
     */
    uninstallResizer: function(resizerElement)
    {
        resizerElement.removeEventListener("mousedown", this._onDragStartBound, false);
        resizerElement.style.removeProperty("cursor");
        this._resizerElements.remove(resizerElement);
    },

    /**
     * @param {!Element} resizer
     * @param {boolean} on
     */
    toggleResizer: function(resizer, on)
    {
        if (on)
            this.installResizer(resizer);
        else
            this.uninstallResizer(resizer);
    },

    /**
     * @param {?Event} event
     */
    _onDragStart: function(event)
    {
        // Only handle drags of the nodes specified.
        if (this._resizerElements.indexOf(event.target) === -1)
            return;
        WebInspector.elementDragStart(this._startResizerDragging.bind(this), this._resizerDragging.bind(this), this._endResizerDragging.bind(this), this._isVertical ? "ew-resize" : "ns-resize", event);
    },

    /**
     * @return {?WebInspector.Setting}
     */
    _setting: function()
    {
        if (!this._settingName)
            return null;

        if (!WebInspector.settings[this._settingName])
            WebInspector.settings[this._settingName] = WebInspector.settings.createSetting(this._settingName, {});

        return WebInspector.settings[this._settingName];
    },

    /**
     * @return {?WebInspector.SplitView.SettingForOrientation}
     */
    _settingForOrientation: function()
    {
        var state = this._setting() ? this._setting().get() : {};
        return this._isVertical ? state.vertical : state.horizontal;
    },

    /**
     * @return {number}
     */
    _lastSidebarSize: function()
    {
        var settingForOrientation = this._settingForOrientation();
        var size = settingForOrientation ? settingForOrientation.size : 0;
        if (!size)
             size = this._isVertical ? this._savedSidebarWidth : this._savedSidebarHeight;
        if (this._useFraction)
            size *= this.totalSize();
        return size;
    },

    /**
     * @return {string}
     */
    _savedShowMode: function()
    {
        var orientationState = this._settingForOrientation();
        return orientationState ? orientationState.showMode : "";
    },

    _sizeToSave: function()
    {
        var size = this._sidebarSize;
        if (size < 0)
            return -1;

        if (this._useFraction)
            size /= this.totalSize();
        return size;
    },

    _saveSetting: function()
    {
        var size = this._sizeToSave();

        if (size !== -1) {
            if (this._isVertical)
                this._savedSidebarWidth = size;
            else
                this._savedSidebarHeight = size;
        }

        var setting = this._setting();
        if (!setting)
            return;
        var state = setting.get();
        var orientationState = (this._isVertical ? state.vertical : state.horizontal) || {};
        if (size !== -1)
            orientationState.size = size;
        if (this._shouldSaveShowMode)
            orientationState.showMode = this._showMode;
        if (this._isVertical)
            state.vertical = orientationState;
        else
            state.horizontal = orientationState;
        setting.set(state);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onZoomChanged: function(event)
    {
        var data = /** @type {{from: number, to: number}} */ (event.data);
        this._innerSetSidebarSize(this.sidebarSize() * data.from / data.to, true);
        this._saveSetting();
    },

    /**
     * @param {string} title
     * @param {string} className
     * @return {!WebInspector.StatusBarButton}
     */
    createShowHideSidebarButton: function(title, className)
    {
        console.assert(this.isVertical(), "Buttons for split view with horizontal split are not supported yet.");

        this._showHideSidebarButtonTitle = WebInspector.UIString(title);
        this._showHideSidebarButton = new WebInspector.StatusBarButton("", (this.isSidebarSecond() ? "right" : "left") + "-sidebar-show-hide-button " + className, 3);
        this._showHideSidebarButton.addEventListener("click", buttonClicked.bind(this));
        this._updateShowHideSidebarButton();

        /**
         * @this {WebInspector.SplitView}
         * @param {!WebInspector.Event} event
         */
        function buttonClicked(event)
        {
            var show = this._isShowingOne;
            if (show)
                this.showBoth();
            else
                this.hideSidebar();
        }

        return this._showHideSidebarButton;
    },

    _updateShowHideSidebarButton: function()
    {
        if (!this._showHideSidebarButton)
            return;
        this._showHideSidebarButton.state = this._isShowingOne === this.isSidebarSecond() ? "left" : "right";
        this._showHideSidebarButton.title = this._isShowingOne ? WebInspector.UIString("Show %s", this._showHideSidebarButtonTitle) : WebInspector.UIString("Hide %s", this._showHideSidebarButtonTitle);
    },

    __proto__: WebInspector.View.prototype
}
