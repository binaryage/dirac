#!/usr/bin/env python
#
# Copyright 2014 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""
Concatenates module scripts based on the module.json descriptor.
Optionally, minifies the result using rjsmin.
"""

from cStringIO import StringIO
from os import path
import os
import re
import sys

try:
    import simplejson as json
except ImportError:
    import json

rjsmin_path = path.abspath(path.join(
        path.dirname(__file__),
        '..',
        '..',
        'build',
        'scripts'))
sys.path.append(rjsmin_path)
import rjsmin


def read_file(filename):
    with open(path.normpath(filename), 'rt') as file:
        return file.read()


def write_file(filename, content):
    # This is here to avoid overwriting source tree files due to hard links.
    if path.exists(filename):
        os.remove(filename)
    with open(filename, 'wt') as file:
        file.write(content)


def concatenate_scripts(file_names, module_dir, output_dir, output):
    for file_name in file_names:
        output.write('/* %s */\n' % file_name)
        file_path = path.join(module_dir, file_name)

        # This allows to also concatenate generated files found in output_dir.
        if not path.isfile(file_path):
            file_path = path.join(output_dir, path.basename(module_dir), file_name)
        output.write(read_file(file_path))
        output.write(';')


def main(argv):
    if len(argv) < 3:
        print('Usage: %s module_json output_file no_minify' % argv[0])
        return 1

    module_json_file_name = argv[1]
    output_file_name = argv[2]
    no_minify = len(argv) > 3 and argv[3]
    module_dir = path.dirname(module_json_file_name)

    output = StringIO()
    descriptor = None
    try:
        descriptor = json.loads(read_file(module_json_file_name))
    except:
        print 'ERROR: Failed to load JSON from ' + module_json_file_name
        raise

    # pylint: disable=E1103
    scripts = descriptor.get('scripts')
    assert(scripts)
    output_root_dir = path.join(path.dirname(output_file_name), '..')
    concatenate_scripts(scripts, module_dir, output_root_dir, output)

    output_script = output.getvalue()
    output.close()
    write_file(output_file_name, output_script if no_minify else rjsmin.jsmin(output_script))

if __name__ == '__main__':
    sys.exit(main(sys.argv))
