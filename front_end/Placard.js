/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @param {string} title
 * @param {string} subtitle
 */
WebInspector.Placard = function(title, subtitle)
{
    this.element = document.createElementWithClass("div", "placard");
    this.element.placard = this;

    this.subtitleElement = this.element.createChild("div", "subtitle");
    this.titleElement = this.element.createChild("div", "title");

    this.title = title;
    this.subtitle = subtitle;
    this.selected = false;
}

WebInspector.Placard.prototype = {
    /** @return {string} */
    get title()
    {
        return this._title;
    },

    set title(x)
    {
        if (this._title === x)
            return;
        this._title = x;
        this.titleElement.textContent = x;
    },

    /** @return {string} */
    get subtitle()
    {
        return this._subtitle;
    },

    set subtitle(x)
    {
        if (this._subtitle === x)
            return;
        this._subtitle = x;
        this.subtitleElement.textContent = x;
    },

    /** @return {boolean} */
    get selected()
    {
        return this._selected;
    },

    set selected(x)
    {
        if (x)
            this.select();
        else
            this.deselect();
    },

    /**
     * @return {!WebInspector.PlacardGroup|undefined}
     */
    group: function()
    {
        return this._group;
    },

    /**
     * @param {!WebInspector.PlacardGroup} group
     */
    setGroup: function(group)
    {
        this._group = group;
    },

    select: function()
    {
        if (this._selected)
            return;
        if (this._group)
            this._group.setExpanded(true);
        this._selected = true;
        this.element.addStyleClass("selected");
    },

    deselect: function()
    {
        if (!this._selected)
            return;
        this._selected = false;
        this.element.removeStyleClass("selected");
    },

    toggleSelected: function()
    {
        this.selected = !this.selected;
    },

    discard: function()
    {
    }
}

/**
 * @constructor
 * @param {string} title
 * @param {!Array.<!WebInspector.Placard>} placards
 */
WebInspector.PlacardGroup = function(title, placards)
{
    this.element = document.createElementWithClass("div", "placard placard-group");
    this.element.addEventListener("click", this._toggleExpanded.bind(this), false);
    this.placards = placards;
    this._expanded = false;
    this.setTitle(title);

    for (var i = 0; i < placards.length; ++i)
        placards[i].setGroup(this);
}

WebInspector.PlacardGroup.prototype = {
    /**
     * @return {string}
     */
    title: function()
    {
        return this._title;
    },

    /**
     * @param {string} title
     */
    setTitle: function(title)
    {
        this._title = title;
        this.element.textContent = title;
    },

    /**
     * @return {boolean}
     */
    expanded: function()
    {
        return this._expanded;
    },

    /**
     * @param {boolean} x
     */
    setExpanded: function(x)
    {
        if (this._expanded === x)
            return;
        if (x) {
            var parent = this.element.parentElement;
            if (!parent)
                return;
            var sibling = this.element.nextSibling;
            for (var i = 0; i < this.placards.length; ++i) {
                var placard = this.placards[i];
                placard.element.addStyleClass("grouped");
                parent.insertBefore(placard.element, sibling);
            }
        } else {
            if (this.selected())
                return;
            for (var i = 0; i < this.placards.length; ++i) {
                var placard = this.placards[i];
                placard.element.removeStyleClass("grouped");
                placard.element.remove();
            }
        }
        this._expanded = x;
    },

    /**
     * @return {boolean}
     */
    selected: function()
    {
        for (var i = 0; i < this.placards.length; ++i) {
            if (this.placards[i].selected)
                return true;
        }
        return false;
    },

    _toggleExpanded: function()
    {
        this.setExpanded(!this._expanded);
        this.element.enableStyleClass("expanded", this._expanded);
    }
}
