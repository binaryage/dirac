#!/usr/bin/env python
#
# Copyright 2016 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import sys
from os import path
from subprocess import Popen

scripts_path = path.dirname(path.dirname(path.abspath(__file__)))
sys.path.append(scripts_path)
import devtools_paths

CURRENT_DIRECTORY = path.dirname(path.abspath(__file__))
ROOT_DIRECTORY = path.join(CURRENT_DIRECTORY, '..', '..')


def main():
    exec_command = [
        devtools_paths.node_path(),
        path.join(CURRENT_DIRECTORY, 'run_lint_check.js'),
    ]

    eslint_proc = Popen(exec_command, cwd=ROOT_DIRECTORY)
    eslint_proc.communicate()

    sys.exit(eslint_proc.returncode)

# Run
if __name__ == '__main__':
    main()
