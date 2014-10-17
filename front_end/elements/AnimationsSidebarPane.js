// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.SidebarPane}
 */
WebInspector.AnimationsSidebarPane = function(stylesPane)
{
    WebInspector.SidebarPane.call(this, WebInspector.UIString("Animations"));
    this._stylesPane = stylesPane;

    this._emptyElement = createElement("div");
    this._emptyElement.className = "info";
    this._emptyElement.textContent = WebInspector.UIString("No Animations");

    this.bodyElement.appendChild(this._emptyElement);
}

WebInspector.AnimationsSidebarPane.prototype = {
    /**
     * @param {?WebInspector.DOMNode} node
     */
    update: function(node)
    {
        /**
         * @param {?Array.<!WebInspector.AnimationModel.AnimationPlayer>} animationPlayers
         * @this {WebInspector.AnimationsSidebarPane}
         */
        function animationPlayersCallback(animationPlayers)
        {
            this.bodyElement.removeChildren();
            this._animationSections = [];
            if (!animationPlayers || !animationPlayers.length) {
                this.bodyElement.appendChild(this._emptyElement);
                return;
            }

            for (var i = 0; i < animationPlayers.length; ++i) {
                var player = animationPlayers[i];
                this._animationSections[i] = new WebInspector.AnimationSection(this, player);
                var separatorElement = this.bodyElement.createChild("div", "sidebar-separator");
                var id = player.source().name() ? player.source().name() : player.id();
                separatorElement.createTextChild(WebInspector.UIString("Animation") + " " + id);
                this.bodyElement.appendChild(this._animationSections[i].element);
            }
        }

        if (this._selectedNode === node) {
            for (var i = 0; i < this._animationSections.length; ++i)
                this._animationSections[i].updateCurrentTime();
            return;
        }
        this._selectedNode = node;
        node.target().animationModel.animationPlayers(node.id, animationPlayersCallback.bind(this));
    },
    __proto__: WebInspector.SidebarPane.prototype
}

/**
 * @constructor
 * @param {!WebInspector.AnimationsSidebarPane} parentPane
 * @param {?WebInspector.AnimationModel.AnimationPlayer} animationPlayer
 */
WebInspector.AnimationSection = function(parentPane, animationPlayer)
{
    this._parentPane = parentPane;
    this.propertiesSection = createElement("div");
    this._setAnimationPlayer(animationPlayer);

    this.element = createElement("div");
    this.element.className = "styles-section";

    this._updateThrottler = new WebInspector.Throttler(WebInspector.AnimationSection.updateTimeout);
    this.element.appendChild(this._createAnimationControls());
    this.element.appendChild(this.propertiesSection);
}

WebInspector.AnimationSection.updateTimeout = 100;

WebInspector.AnimationSection.prototype = {
    updateCurrentTime: function()
    {
        this._updateThrottler.schedule(this._updateCurrentTime.bind(this), false);
    },

    /**
     * @param {!WebInspector.Throttler.FinishCallback} finishCallback
     */
    _updateCurrentTime: function(finishCallback)
    {
        /**
         * @param {number} currentTime
         * @param {boolean} isRunning
         * @this {WebInspector.AnimationSection}
         */
        function updateSliderCallback(currentTime, isRunning)
        {
            this.currentTimeSlider.value = this.player.source().iterationCount() == null ? currentTime % this.player.source().duration() : currentTime;
            finishCallback();
            if (isRunning && this._parentPane.isShowing())
                this.updateCurrentTime();
        }
        this.player.getCurrentState(updateSliderCallback.bind(this));
    },

    /**
     * @return {!Element}
     */
    _createCurrentTimeSlider: function()
    {
        /**
         * @param {!Event} e
         * @this {WebInspector.AnimationSection}
         */
        function sliderInputHandler(e)
        {
            this.player.setCurrentTime(parseFloat(e.target.value), this._setAnimationPlayer.bind(this));
        }

        var iterationDuration = this.player.source().duration();
        var iterationCount = this.player.source().iterationCount();
        var slider = createElement("input");
        slider.type = "range";
        slider.min = 0;
        slider.step = 0.01;

        if (!iterationCount) {
            // Infinite iterations
            slider.max = iterationDuration;
            slider.value = this.player.currentTime() % iterationDuration;
        } else {
            slider.max = iterationCount * iterationDuration;
            slider.value = this.player.currentTime();
        }

        slider.addEventListener("input", sliderInputHandler.bind(this));
        this.updateCurrentTime();
        return slider;
    },

    /**
     * @return {!Element}
     */
    _createAnimationControls: function()
    {
        /**
         * @this {WebInspector.AnimationSection}
         */
        function pauseButtonHandler()
        {
            if (this.player.paused()) {
                this.player.play(this._setAnimationPlayer.bind(this));
                updatePauseButton.call(this, false);
                this.updateCurrentTime();
            } else {
                this.player.pause(this._setAnimationPlayer.bind(this));
                updatePauseButton.call(this, true);
            }
        }

        /**
         * @param {boolean} paused
         * @this {WebInspector.AnimationSection}
         */
        function updatePauseButton(paused)
        {
            this._pauseButton.state = paused;
            this._pauseButton.title = paused ? WebInspector.UIString("Play animation") : WebInspector.UIString("Pause animation");
        }

        this._pauseButton = new WebInspector.StatusBarButton("", "animation-pause");
        updatePauseButton.call(this, this.player.paused());
        this._pauseButton.addEventListener("click", pauseButtonHandler, this);

        this.currentTimeSlider = this._createCurrentTimeSlider();

        var controls = createElement("div");
        controls.appendChild(this._pauseButton.element);
        controls.appendChild(this.currentTimeSlider);

        return controls;
    },

    /**
     * @param {?WebInspector.AnimationModel.AnimationPlayer} p
     */
    _setAnimationPlayer: function(p)
    {
        if (!p || p === this.player)
            return;
        this.player = p;
        this.propertiesSection.removeChildren();
        var animationObject = {
            "playState": p.playState(),
            "start-time": p.startTime(),
            "player-playback-rate": p.playbackRate(),
            "id": p.id(),
            "start-delay": p.source().startDelay(),
            "playback-rate": p.source().playbackRate(),
            "iteration-start": p.source().iterationStart(),
            "iteration-count": p.source().iterationCount(),
            "duration": p.source().duration(),
            "direction": p.source().direction(),
            "fill-mode": p.source().fillMode(),
            "time-fraction": p.source().timeFraction()
        };
        var obj = WebInspector.RemoteObject.fromLocalObject(animationObject);
        var section = new WebInspector.ObjectPropertiesSection(obj, WebInspector.UIString("Animation Properties"));
        this.propertiesSection.appendChild(section.element);
    }
}