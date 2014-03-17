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
 */
WebInspector.SplitView = function(isVertical, secondIsSidebar, settingName, defaultSidebarWidth, defaultSidebarHeight)
{
    WebInspector.View.call(this);

    this.registerRequiredCSS("splitView.css");
    this.element.classList.add("split-view");

    WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._onZoomChanged, this);

    this._mainView = new WebInspector.VBox();
    this._mainView.makeLayoutBoundary();
    this._mainElement = this._mainView.element;
    this._mainElement.className = "split-view-contents scroll-target split-view-main vbox"; // Override

    this._sidebarView = new WebInspector.VBox();
    this._sidebarView.makeLayoutBoundary();
    this._sidebarElement = this._sidebarView.element;
    this._sidebarElement.className = "split-view-contents scroll-target split-view-sidebar vbox"; // Override

    this._resizerElement = this.element.createChild("div", "split-view-resizer");
    this._resizerElement.createChild("div", "split-view-resizer-border");
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

    this._defaultSidebarWidth = defaultSidebarWidth || 200;
    this._defaultSidebarHeight = defaultSidebarHeight || this._defaultSidebarWidth;
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
        this._restoreSidebarSizeFromSettings();
        if (this._shouldSaveShowMode)
            this._restoreAndApplyShowModeFromSettings();
        this._updateShowHideSidebarButton();
        this._updateResizersClass();
    },

    /**
     * @param {boolean=} animate
     */
    _updateLayout: function(animate)
    {
        delete this._totalSize; // Lazy update.
        this._innerSetSidebarSize(this._preferredSidebarSize(), false, animate);
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
        this._restoreAndApplyShowModeFromSettings();
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
        if (this._showMode !== WebInspector.SplitView.ShowMode.Both)
            return null;
        return this._isVertical ?
            (this._secondIsSidebar ? "right" : "left") :
            (this._secondIsSidebar ? "bottom" : "top");
    },

    /**
     * @return {number}
     */
    preferredSidebarSize: function()
    {
        return this._preferredSidebarSize();
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
     * @override
     */
    detachChildViews: function()
    {
        this._mainView.detachChildViews();
        this._sidebarView.detachChildViews();
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
            this._resizerElement.classList.add("hidden");
            this._removeAllLayoutProperties();
        }

        if (animate) {
            this._animate(true, callback.bind(this));
        } else {
            callback.call(this);
            this.doResize();
        }

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
       if (this._showMode === WebInspector.SplitView.ShowMode.Both)
            animate = false;

        this._cancelAnimation();
        this._mainElement.classList.remove("maximized");
        this._sidebarElement.classList.remove("maximized");
        this._resizerElement.classList.remove("hidden");

        this._mainView.show(this.element);
        this._sidebarView.show(this.element);
        // Order views in DOM properly.
        this.setSecondIsSidebar(this._secondIsSidebar);

        this._sidebarSize = -1;
        this.setResizable(true);
        this._updateShowMode(WebInspector.SplitView.ShowMode.Both);
        this._updateLayout(animate);
    },

    /**
     * @param {boolean} resizable
     */
    setResizable: function(resizable)
    {
        this._resizable = resizable;
        this._updateResizersClass();
    },

    /**
     * @param {number} size
     */
    setSidebarSize: function(size)
    {
        this._innerSetSidebarSize(size);
        this._saveSidebarSizeToSettings();
    },

    /**
     * @return {number}
     */
    sidebarSize: function()
    {
        return Math.max(0, this._sidebarSize);
    },

    /**
     * Returns total size in DIP.
     * @return {number}
     */
    totalSize: function()
    {
        if (!this._totalSize)
            this._totalSize = this._isVertical ? this.element.offsetWidth : this.element.offsetHeight;
        return this._totalSize * WebInspector.zoomManager.zoomFactor();
    },

    /**
     * @param {string} showMode
     */
    _updateShowMode: function(showMode)
    {
        this._showMode = showMode;
        this._saveShowModeToSettings();
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
        if (this._showMode !== WebInspector.SplitView.ShowMode.Both) {
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

        var sizeValue = (size / WebInspector.zoomManager.zoomFactor()) + "px";
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

        var zoomFactor = WebInspector.zoomManager.zoomFactor();
        var marginFrom = reverse ? "0" : "-" + (this._sidebarSize / zoomFactor) + "px";
        var marginTo = reverse ? "-" + (this._sidebarSize / zoomFactor) + "px" : "0";

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
        const minPadding = 20;
        var totalSize = this.totalSize();
        var minimumSiderbarSizeContraint = this.isVertical() ? this._minimumSidebarWidth : this._minimumSidebarHeight;
        var from = minimumSiderbarSizeContraint || 0;
        if (typeof minimumSiderbarSizeContraint !== "number")
            from = Math.max(from, minPadding);

        var minimumMainSizeConstraint = this.isVertical() ? this._minimumMainWidth : this._minimumMainHeight;
        var minMainSize = minimumMainSizeConstraint || 0;
        if (typeof minimumMainSizeConstraint !== "number")
            minMainSize = Math.max(minMainSize, minPadding);

        var to = totalSize - minMainSize;
        if (from <= to)
            return Number.constrain(sidebarSize, from, to);

        return -1;
    },

    wasShown: function()
    {
        this._updateLayout();
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

        var dipEventPosition = (this._isVertical ? event.pageX : event.pageY) * WebInspector.zoomManager.zoomFactor();
        this._dragOffset = (this._secondIsSidebar ? this.totalSize() - this._sidebarSize : this._sidebarSize) - dipEventPosition;
        return true;
    },

    /**
     * @param {!MouseEvent} event
     */
    _resizerDragging: function(event)
    {
        var dipEventPosition = (this._isVertical ? event.pageX : event.pageY) * WebInspector.zoomManager.zoomFactor();
        var newOffset = dipEventPosition + this._dragOffset;
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
        this._saveSidebarSizeToSettings();
    },

    hideDefaultResizer: function()
    {
        this.uninstallResizer(this._resizerElement);
    },

    /**
     * @param {!Element} resizerElement
     */
    installResizer: function(resizerElement)
    {
        resizerElement.addEventListener("mousedown", this._onDragStartBound, false);
        resizerElement.classList.toggle("ew-resizer-widget", this._isVertical && this._resizable);
        resizerElement.classList.toggle("ns-resizer-widget", !this._isVertical && this._resizable);
        if (this._resizerElements.indexOf(resizerElement) === -1)
            this._resizerElements.push(resizerElement);
    },

    /**
     * @param {!Element} resizerElement
     */
    uninstallResizer: function(resizerElement)
    {
        resizerElement.removeEventListener("mousedown", this._onDragStartBound, false);
        resizerElement.classList.remove("ew-resizer-widget");
        resizerElement.classList.remove("ns-resizer-widget");
        this._resizerElements.remove(resizerElement);
    },

    /**
     * @return {boolean}
     */
    hasCustomResizer: function()
    {
        return this._resizerElements.length > 1 || (this._resizerElements.length == 1 && this._resizerElements[0] !== this._resizerElement);
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

    _updateResizersClass: function()
    {
        for (var i = 0; i < this._resizerElements.length; ++i) {
            this._resizerElements[i].classList.toggle("ew-resizer-widget", this._isVertical && this._resizable);
            this._resizerElements[i].classList.toggle("ns-resizer-widget", !this._isVertical && this._resizable);
        }
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
    _preferredSidebarSize: function()
    {
        var size = this._savedSidebarSize;
        if (!size) {
            size = this._isVertical ? this._defaultSidebarWidth : this._defaultSidebarHeight;
            // If we have default value in percents, calculate it on first use.
            if (0 < size && size < 1)
                size *= this.totalSize();
        }
        return size;
    },

    _restoreSidebarSizeFromSettings: function()
    {
        var settingForOrientation = this._settingForOrientation();
        this._savedSidebarSize = settingForOrientation ? settingForOrientation.size : 0;
    },

    _restoreAndApplyShowModeFromSettings: function()
    {
        var orientationState = this._settingForOrientation();
        this._savedShowMode = orientationState ? orientationState.showMode : WebInspector.SplitView.ShowMode.Both;
        this._showMode = this._savedShowMode;

        switch (this._savedShowMode) {
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

    _saveSidebarSizeToSettings: function()
    {
        if (this._sidebarSize < 0)
            return;

        this._savedSidebarSize = this._sidebarSize;
        this._saveSetting();
    },

    _saveShowModeToSettings: function()
    {
        this._savedShowMode = this._showMode;
        this._saveSetting();
    },

    _saveSetting: function()
    {
        var setting = this._setting();
        if (!setting)
            return;
        var state = setting.get();
        var orientationState = (this._isVertical ? state.vertical : state.horizontal) || {};

        orientationState.size = this._savedSidebarSize;
        if (this._shouldSaveShowMode)
            orientationState.showMode = this._savedShowMode;

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
        // Force layout even if sidebar size does not change.
        this._sidebarSize = -1;
        if (this.isShowing())
            this._updateLayout();
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
        this._showHideSidebarButton = new WebInspector.StatusBarButton("", "sidebar-show-hide-button " + className, 3);
        this._showHideSidebarButton.addEventListener("click", buttonClicked.bind(this));
        this._updateShowHideSidebarButton();

        /**
         * @this {WebInspector.SplitView}
         * @param {!WebInspector.Event} event
         */
        function buttonClicked(event)
        {
            if (this._showMode !== WebInspector.SplitView.ShowMode.Both)
                this.showBoth(true);
            else
                this.hideSidebar(true);
        }

        return this._showHideSidebarButton;
    },

    _updateShowHideSidebarButton: function()
    {
        if (!this._showHideSidebarButton)
            return;
        var sidebarHidden = this._showMode === WebInspector.SplitView.ShowMode.OnlyMain;
        this._showHideSidebarButton.state = sidebarHidden ? "show" : "hide";
        this._showHideSidebarButton.element.classList.toggle("top-sidebar-show-hide-button", !this.isVertical() && !this.isSidebarSecond());
        this._showHideSidebarButton.element.classList.toggle("right-sidebar-show-hide-button", this.isVertical() && this.isSidebarSecond());
        this._showHideSidebarButton.element.classList.toggle("bottom-sidebar-show-hide-button", !this.isVertical() && this.isSidebarSecond());
        this._showHideSidebarButton.element.classList.toggle("left-sidebar-show-hide-button", this.isVertical() && !this.isSidebarSecond());
        this._showHideSidebarButton.title = sidebarHidden ? WebInspector.UIString("Show %s", this._showHideSidebarButtonTitle) : WebInspector.UIString("Hide %s", this._showHideSidebarButtonTitle);
    },

    __proto__: WebInspector.View.prototype
}
