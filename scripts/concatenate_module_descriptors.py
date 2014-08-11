#!/usr/bin/env python
#
# Copyright 2014 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Inlines all module.json files into modules.js."""

from os import path
import errno
import shutil
import sys
try:
    import simplejson as json
except ImportError:
    import json


def read_file(filename):
    with open(filename, 'rt') as file:
        return file.read()


def build_modules(module_jsons):
    result = []
    for json_filename in module_jsons:
        if not path.exists(json_filename):
            continue
        module_name = path.basename(path.dirname(json_filename))

        # pylint: disable=E1103
        module_json = json.loads(read_file(json_filename))
        module_json['name'] = module_name

        # Clear scripts, as they are not used at runtime
        # (only the fact of their presence is important).
        if module_json.get('scripts'):
            module_json['scripts'] = []
        result.append(module_json)
    return json.dumps(result)


def main(argv):
    input_filename = argv[1]
    output_filename = argv[2]
    module_jsons = argv[3:]

    with open(output_filename, 'w') as output_file:
        output_file.write('var allDescriptors=%s;' % build_modules(module_jsons))


if __name__ == '__main__':
    sys.exit(main(sys.argv))
