#!/usr/bin/env python
#
# Copyright (C) 2010 Google Inc. All rights reserved.
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
#

from os import path
import os
import sys


def generate_include_tag(resource_path):
    if (resource_path.endswith('.js')):
        return '    <script type="text/javascript" src="%s"></script>\n' % resource_path
    elif (resource_path.endswith('.css')):
        return '    <link rel="stylesheet" type="text/css" href="%s">\n' % resource_path
    else:
        assert resource_path


def write_app_input_html(app_input_file, app_output_file, application_name, debug):
    for line in app_input_file:
        if not debug:
            if '<script ' in line or '<link ' in line:
                continue
            if '</head>' in line:
                app_output_file.write(generate_include_tag("%s.css" % application_name))
                app_output_file.write(generate_include_tag("%s.js" % application_name))
        app_output_file.write(line)


def main(argv):

    if len(argv) < 4:
        print('usage: %s app_input_html generated_app_html debug' % argv[0])
        return 1
    # The first argument is ignored. We put 'web.gyp' in the inputs list
    # for this script, so every time the list of script gets changed, our html
    # file is rebuilt.
    app_input_html_name = argv[1]
    app_output_html_name = argv[2]
    debug = argv[3] != '0'
    application_name = path.splitext(path.basename(app_input_html_name))[0]
    with open(app_input_html_name, 'r') as app_input_html:
        with open(app_output_html_name, 'w') as app_output_html:
            write_app_input_html(app_input_html, app_output_html, application_name, debug)

if __name__ == '__main__':
    sys.exit(main(sys.argv))
