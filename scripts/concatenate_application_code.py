#!/usr/bin/env python
#
# Copyright 2014 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""
Concatenates autostart modules, application modules' module.json descriptors,
and the application loader into a single script.
Also concatenates all workers' dependencies into individual worker loader scripts.
"""

from cStringIO import StringIO
from os import path
from modular_build import read_file, write_file, bail_error
import copy
import modular_build
import os
import re
import sys

try:
    import simplejson as json
except ImportError:
    import json

rjsmin_path = os.path.abspath(os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "build",
    "scripts"))
sys.path.append(rjsmin_path)
import rjsmin


def minify_if_needed(javascript, minify):
    return rjsmin.jsmin(javascript) if minify else javascript


def concatenate_autostart_modules(descriptors, application_dir, output_dir, output):
    non_autostart = set()
    sorted_module_names = descriptors.sorted_modules()
    for name in sorted_module_names:
        desc = descriptors.modules[name]
        name = desc['name']
        type = descriptors.application[name].get('type')
        if type == 'autostart':
            deps = set(desc.get('dependencies', []))
            non_autostart_deps = deps & non_autostart
            if len(non_autostart_deps):
                bail_error('Non-autostart dependencies specified for the autostarted module "%s": %s' % (name, non_autostart_deps))
            output.write('\n/* Module %s */\n' % name)
            modular_build.concatenate_scripts(desc.get('scripts'), path.join(application_dir, name), output_dir, output)
        elif type != 'worker':
            non_autostart.add(name)


def concatenate_application_script(application_name, descriptors, application_dir, output_dir, minify):
    application_loader_name = application_name + '.js'
    output = StringIO()
    runtime_contents = read_file(path.join(application_dir, 'Runtime.js'))
    runtime_contents = re.sub('var allDescriptors = \[\];', 'var allDescriptors = %s;' % release_module_descriptors(descriptors.modules).replace("\\", "\\\\"), runtime_contents, 1)
    output.write('/* Runtime.js */\n')
    output.write(runtime_contents)
    output.write('\n/* Autostart modules */\n')
    concatenate_autostart_modules(descriptors, application_dir, output_dir, output)
    output.write('/* Application descriptor %s */\n' % (application_name + '.json'))
    output.write('applicationDescriptor = ')
    output.write(descriptors.application_json)
    output.write(';\n/* Application loader */\n')
    output.write(read_file(path.join(application_dir, application_loader_name)))

    write_file(path.join(output_dir, application_loader_name), minify_if_needed(output.getvalue(), minify))
    output.close()


def concatenate_worker(module_name, descriptors, application_dir, output_dir, minify):
    descriptor = descriptors.modules[module_name]
    scripts = descriptor.get('scripts')
    if not scripts:
        return
    worker_dir = path.join(application_dir, module_name)
    output_file_path = path.join(output_dir, module_name + '_module.js')

    output = StringIO()
    output.write('/* Worker %s */\n' % module_name)
    dependencies = descriptors.sorted_dependencies_closure(module_name)
    dep_descriptors = []
    for dep_name in dependencies:
        dep_descriptor = descriptors.modules[dep_name]
        dep_descriptors.append(dep_descriptor)
        scripts = dep_descriptor.get('scripts')
        if scripts:
            output.write('\n/* Module %s */\n' % dep_name)
            modular_build.concatenate_scripts(scripts, path.join(application_dir, dep_name), output_dir, output)

    write_file(output_file_path, minify_if_needed(output.getvalue(), minify))
    output.close()


def release_module_descriptors(module_descriptors):
    result = []
    for name in module_descriptors:
        module = copy.copy(module_descriptors[name])
        # Clear scripts, as they are not used at runtime
        # (only the fact of their presence is important).
        if module.get('scripts'):
            module['scripts'] = []
        result.append(module)
    return json.dumps(result)


def build_application(application_name, loader, application_dir, output_dir, minify):
    descriptors = loader.load_application(application_name + '.json')
    concatenate_application_script(application_name, descriptors, application_dir, output_dir, minify)
    for module in filter(lambda desc: desc.get('type') == 'worker', descriptors.application.values()):
        concatenate_worker(module['name'], descriptors, application_dir, output_dir, minify)
