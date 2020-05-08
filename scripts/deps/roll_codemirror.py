#!/usr/bin/env python
#
# Copyright 2019 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Helper script to update CodeMirror from upstream.
"""

import argparse
import glob
import os
import shutil
import subprocess
import sys


def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Roll CodeMirror')
    parser.add_argument('cm_dir', help='CodeMirror directory')
    parser.add_argument('devtools_dir', help='DevTools directory')
    return parser.parse_args(cli_args)


def run_npm(options):
    print 'Building CodeMirror in %s' % os.path.abspath(options.cm_dir)
    subprocess.check_output(['npm', 'install'], cwd=options.cm_dir, stderr=subprocess.PIPE)
    subprocess.check_output(['npm', 'run', 'build'], cwd=options.cm_dir, stderr=subprocess.PIPE)


def copy_lib_files(options):
    print 'Copying codemirror.js and codemirror.css'
    result = ''
    target_dir = os.path.join(options.devtools_dir, 'front_end', 'cm')

    with open(os.path.join(options.cm_dir, 'lib', 'codemirror.js'), 'r') as read:
        lines = read.readlines()
    with open(os.path.join(target_dir, 'codemirror.js'), 'w') as write:
        for line in lines:
            if 'CodeMirror.version =' in line:
                result = line.strip()
            write.write(line)

    with open(os.path.join(options.cm_dir, 'lib', 'codemirror.css'), 'r') as read:
        lines = read.readlines()
    found_stop = False
    with open(os.path.join(target_dir, 'codemirror.css'), 'w') as write:
        for line in lines:
            if found_stop:
                write.write(line)
            elif '/* STOP */' in line:
                found_stop = True
    assert found_stop
    return result


def find_and_copy_js_files(source_dir, target_dir, filter_fn):
    for f in os.listdir(target_dir):
        if not filter_fn(f):
            continue
        target_file = os.path.join(target_dir, f)
        if not os.path.isfile(os.path.join(target_dir, f)):
            continue
        source = glob.glob(os.path.join(source_dir, '*', f))
        assert len(source) == 1
        source_file = source[0]
        print 'Copying %s from %s' % (target_file, source_file)
        shutil.copyfile(source_file, target_file)


def copy_cm_files(options):
    source_dir = os.path.join(options.cm_dir, 'addon')
    target_dir = os.path.join(options.devtools_dir, 'front_end', 'cm')

    def cm_filter(f):
        return f.endswith('.js') and f != 'codemirror.js' and f != 'cm.js'

    find_and_copy_js_files(source_dir, target_dir, cm_filter)



if __name__ == '__main__':
    OPTIONS = parse_options(sys.argv[1:])
    run_npm(OPTIONS)
    copy_cm_files(OPTIONS)
    VERSION = copy_lib_files(OPTIONS)
    print VERSION
