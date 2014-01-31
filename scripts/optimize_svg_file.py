#!/usr/bin/env python
# Copyright (c) 2014 Google Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#         * Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
#         * Redistributions in binary form must reproduce the above
# copyright notice, this list of conditions and the following disclaimer
# in the documentation and/or other materials provided with the
# distribution.
#         * Neither the name of Google Inc. nor the names of its
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

import re
import string
import sys
import xml.dom.minidom


def _optimize_number(value):
    try:
        if value[0] == "#" or value[0] == "n":
            return value
        numeric = round(float(value), 2)
        short = int(numeric)
        if short == numeric:
            return str(short)
        return str(numeric)
    except:
        return value


def _optimize_value(value, default):
    value = value.strip()
    if value.endswith("px"):
        value = value[:-2]
    if value.endswith("pt"):
        print "WARNING: 'pt' size units are undesirable."
    if len(value) == 7 and value[0] == "#" and value[1] == value[2] and value[3] == value[4] and value[6] == value[6]:
        value = "#" + value[1] + value[3] + value[5]
    value = _optimize_number(value)
    if value == default:
        value = ""
    return value


def _optimize_values(node, defaults):
    items = {}
    if node.hasAttribute("style"):
        for item in node.getAttribute("style").strip(";").split(";"):
            [key, value] = item.split(":", 1)
            key = key.strip()
            if key not in defaults:
                continue
            items[key] = _optimize_value(value, defaults[key])

    for key in defaults.keys():
        if node.hasAttribute(key):
            value = _optimize_value(node.getAttribute(key), defaults[key])
            items[key] = value

    if len([(key, value) for key, value in items.iteritems() if value != ""]) > 4:
        style = []
        for key, value in items.iteritems():
            if node.hasAttribute(key):
                node.removeAttribute(key)
            if value != "":
                style.append(key + ":" + value)
        node.setAttribute("style", string.join(sorted(style), ";"))
    else:
        if node.hasAttribute("style"):
            node.removeAttribute("style")
        for key, value in items.iteritems():
            if value == "":
                if node.hasAttribute(key):
                    node.removeAttribute(key)
            else:
                node.setAttribute(key, value)


def _optimize_path(value):
    path = []
    commands = "mMzZlLhHvVcCsSqQtTaA"
    last = 0
    raw = " " + value + " "
    for i in range(len(raw)):
        if raw[i] in [" ", ","]:
            if last < i:
                path.append(raw[last:i])
            # Consumed whitespace
            last = i + 1
        elif raw[i] == "-" and raw[i - 1] != "e" and raw[i - 1] != "e":
            if last < i:
                path.append(raw[last:i])
            last = i
        elif raw[i] in commands:
            if last < i:
                path.append(raw[last:i])
            path.append(raw[i])
            # Consumed command
            last = i + 1
    out = []
    need_space = False
    for item in path:
        if item in commands:
            need_space = False
        else:
            item = _optimize_number(item)
            if need_space and item[0] != "-":
                out.append(" ")
            need_space = True
        out.append(item)
    return string.join(out, "")


def _optimize_paths(dom):
    for node in dom.getElementsByTagName("path"):
        path = node.getAttribute("d")
        node.setAttribute("d", _optimize_path(path))


def _check_groups(dom, errors):
    if len(dom.getElementsByTagName("g")) != 0:
        errors.append("Groups are prohibited.")


def _check_text(dom, errors):
    if len(dom.getElementsByTagName("text")) != 0:
        errors.append("Text elements prohibited.")


def _check_transform(dom, errors):
    if (any(path.hasAttribute("transform") for path in dom.getElementsByTagName("path")) or
        any(rect.hasAttribute("transform") for rect in dom.getElementsByTagName("rect"))):
        errors.append("Transforms are prohibited.")


def _cleanup_dom_recursively(node, dtd):
    junk = []
    for child in node.childNodes:
        if child.nodeName in dtd:
            _cleanup_dom_recursively(child, dtd[child.nodeName])
        else:
            junk.append(child)

    for child in junk:
        node.removeChild(child)


def _cleanup_dom(dom):
    dtd = {
        "svg": {
            "sodipodi:namedview": {
                "inkscape:grid": {}},
            "defs": {
                "linearGradient": {
                    "stop": {}},
                "radialGradient": {
                    "stop": {}}},
            "path": {},
            "rect": {}}}
    _cleanup_dom_recursively(dom, dtd)


def _cleanup_sodipodi(dom):
    for node in dom.getElementsByTagName("svg"):
        for key in node.attributes.keys():
            if key not in ["height", "version", "width", "xml:space", "xmlns", "xmlns:xlink", "xmlns:sodipodi", "xmlns:inkscape"]:
                node.removeAttribute(key)

    for node in dom.getElementsByTagName("sodipodi:namedview"):
        for key in node.attributes.keys():
            if key != "showgrid":
                node.removeAttribute(key)

    for nodeName in ["defs", "linearGradient", "path", "radialGradient", "rect", "stop", "svg"]:
        for node in dom.getElementsByTagName(nodeName):
            for key in node.attributes.keys():
                if key.startswith("sodipodi:") or key.startswith("inkscape:"):
                    node.removeAttribute(key)


def _cleanup_ids(dom):
    for nodeName in ["defs", "path", "rect", "sodipodi:namedview", "stop", "svg"]:
        for node in dom.getElementsByTagName(nodeName):
            if node.hasAttribute("id"):
                node.removeAttribute("id")


def _optimize_path_attributes(dom):
    defaults = {
        "fill": "#000",
        "fill-opacity": "1",
        "fill-rule": "nonzero",
        "opacity": "1",
        "stroke": "none",
        "stroke-dasharray": "none",
        "stroke-linecap": "butt",
        "stroke-linejoin": "miter",
        "stroke-miterlimit": "4",
        "stroke-opacity": "1",
        "stroke-width": "1"}
    for nodeName in ["path", "rect"]:
        for node in dom.getElementsByTagName(nodeName):
            _optimize_values(node, defaults)


def _optimize_stop_attributes(dom):
    defaults = {
        "stop-color": "#000",
        "stop-opacity": "1"}
    for node in dom.getElementsByTagName("stop"):
        _optimize_values(node, defaults)


def _cleanup_gradients(dom):
    while True:
        gradients = []
        for nodeName in ["linearGradient", "radialGradient"]:
            for node in dom.getElementsByTagName(nodeName):
                name = node.getAttribute("id")
                gradients.append({"node": node, "ref": "#" + name, "url": "url(#" + name + ")", "has_ref": False})
        for nodeName in ["linearGradient", "path", "radialGradient", "rect"]:
            for node in dom.getElementsByTagName(nodeName):
                for key in node.attributes.keys():
                    if key == "id":
                        continue
                    value = node.getAttribute(key)
                    for gradient in gradients:
                        if gradient["has_ref"] == False:
                            if value == gradient["ref"] or value.find(gradient["url"]) != -1:
                                gradient["has_ref"] = True
        finished = True
        for gradient in gradients:
            if gradient["has_ref"] == False:
                gradient["node"].parentNode.removeChild(gradient["node"])
                finished = False
        if finished:
            break


def _generate_name(num):
    letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    n = len(letters)
    if num < n:
        return letters[num]
    return letters[num / n] + letters[num % n]


def _optimize_gradient_ids(dom):
    gradients = []
    names = {}
    for nodeName in ["linearGradient", "radialGradient"]:
        for node in dom.getElementsByTagName(nodeName):
            name = node.getAttribute("id")
            gradients.append({"node": node, "name": name, "ref": "#" + name, "url": "url(#" + name + ")", "new_name": None})
            names[name] = True
    cntr = 0
    for gradient in gradients:
        if len(gradient["name"]) > 2:
            while True:
                new_name = _generate_name(cntr)
                cntr = cntr + 1
                if new_name not in names:
                    gradient["new_name"] = new_name
                    gradient["node"].setAttribute("id", new_name)
                    break
    if cntr == 0:
        return
    gradients = [gradient for gradient in gradients if gradient["new_name"] is not None]
    for nodeName in ["linearGradient", "path", "radialGradient", "rect"]:
        for node in dom.getElementsByTagName(nodeName):
            for key in node.attributes.keys():
                if key == "id":
                    continue
                value = node.getAttribute(key)
                for gradient in gradients:
                    if value == gradient["ref"]:
                        node.setAttribute(key, "#" + gradient["new_name"])
                    elif value.find(gradient["url"]) != -1:
                        value = value.replace(gradient["url"], "url(#" + gradient["new_name"] + ")")
                        node.setAttribute(key, value)


def _build_xml(dom):
    raw_xml = dom.toxml("utf-8")
    # Turn to one-node-per-line
    pretty_xml = re.sub("([^?])(/?>)(?!</)", "\\1\\n\\2", raw_xml)
    return pretty_xml


def optimize_svg(file, errors):
    try:
        dom = xml.dom.minidom.parse(file)
    except:
        errors.append("Can't parse XML.")
        return

    _check_groups(dom, errors)
    _check_text(dom, errors)
    _check_transform(dom, errors)
    if len(errors) != 0:
        return

    _cleanup_dom(dom)
    _cleanup_ids(dom)
    _cleanup_sodipodi(dom)
    _cleanup_gradients(dom)

    _optimize_gradient_ids(dom)
    _optimize_path_attributes(dom)
    _optimize_stop_attributes(dom)
    _optimize_paths(dom)
    # TODO: Bake nested gradients
    # TODO: Optimize gradientTransform

    with open(file, "w") as text_file:
        text_file.write(_build_xml(dom))


if __name__ == '__main__':
    if len(sys.argv) != 1:
        print('usage: %s input_file' % sys.argv[0])
        sys.exit(1)
    errors = []
    optimize_svg(sys.argv[1], errors)
    for error in errors:
        print "ERROR: %s" % (error)
    if len(errors) != 0:
        sys.exit(1)
    else:
        sys.exit(0)
