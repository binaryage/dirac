#!/usr/bin/env python
#
# Copyright 2020 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""
Run tests on a pinned version of chrome.
"""

import argparse
import os
import re
from subprocess import Popen
import sys
import signal

ROOT_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
scripts_path = os.path.join(ROOT_DIRECTORY, 'scripts')
sys.path.append(scripts_path)

import devtools_paths
import test_helpers

CONDUCTOR_DIRECTORY = os.path.join(ROOT_DIRECTORY, 'test', 'conductor')
E2E_MOCHA_CONFIGURATION_LOCATION = os.path.join(ROOT_DIRECTORY, 'test', 'e2e', '.mocharc.js')


def parse_options(cli_args):
    parser = argparse.ArgumentParser(description='Run tests')
    parser.add_argument('--chrome-binary', dest='chrome_binary', help='path to Chromium binary')
    parser.add_argument('--test-suite', dest='test_suite', help='path to test suite')
    parser.add_argument('--test-file', dest='test_file', help='an absolute path for the file to test')
    parser.add_argument(
        '--chrome-features',
        dest='chrome_features',
        help='comma separated list of strings passed to --enable-features on the chromium commandline')
    return parser.parse_args(cli_args)


def compile_typescript(typescript_targets):
    for target in typescript_targets:
        print("Compiling %s TypeScript" % (target['name']))
        exec_command = [devtools_paths.node_path(), devtools_paths.typescript_compiler_path(), '-p', target['path']]
        exit_code = test_helpers.popen(exec_command)
        if exit_code != 0:
            return True

    return False


def run_tests(chrome_binary, chrome_features, test_suite, test_suite_list_path, test_file=None):
    env = os.environ.copy()
    env['CHROME_BIN'] = chrome_binary
    env['TEST_LIST'] = test_suite_list_path
    if chrome_features:
        env['CHROME_FEATURES'] = chrome_features

    if test_file is not None:
        env['TEST_FILE'] = test_file

    cwd = devtools_paths.devtools_root_path()
    if test_suite == 'e2e':
        exec_command = [
            devtools_paths.node_path(),
            devtools_paths.mocha_path(),
            '--config',
            E2E_MOCHA_CONFIGURATION_LOCATION,
        ]
    else:
        runner_path = os.path.join(cwd, 'test', 'shared', 'runner.js')
        exec_command = [devtools_paths.node_path(), runner_path]

    exit_code = test_helpers.popen(exec_command, cwd=cwd, env=env)
    if exit_code != 0:
        return True

    return False


def run_test():
    OPTIONS = parse_options(sys.argv[1:])
    is_cygwin = sys.platform == 'cygwin'
    chrome_binary = None
    test_suite = None
    chrome_features = None

    # Default to the downloaded / pinned Chromium binary
    downloaded_chrome_binary = devtools_paths.downloaded_chrome_binary_path()
    if test_helpers.check_chrome_binary(downloaded_chrome_binary):
        chrome_binary = downloaded_chrome_binary

    # Override with the arg value if provided.
    if OPTIONS.chrome_binary:
        chrome_binary = OPTIONS.chrome_binary
        if not test_helpers.check_chrome_binary(chrome_binary):
            print('Unable to find a Chrome binary at \'%s\'' % chrome_binary)
            sys.exit(1)

    if OPTIONS.chrome_features:
        chrome_features = '--enable-features=%s' % OPTIONS.chrome_features

    if (chrome_binary is None):
        print('Unable to run, no Chrome binary provided')
        sys.exit(1)

    if (OPTIONS.test_suite is None):
        print('Unable to run, no test suite provided')
        sys.exit(1)

    test_suite = OPTIONS.test_suite
    test_file = OPTIONS.test_file

    print('Using Chromium binary ({}{})\n'.format(chrome_binary, ' ' + chrome_features if chrome_features else ''))
    print('Using Test Suite (%s)\n' % test_suite)

    if test_file is not None:
        print('Testing file (%s)' % test_file)

    cwd = devtools_paths.devtools_root_path()
    shared_path = os.path.join(cwd, 'test', 'shared')
    test_suite_path = os.path.join(cwd, 'test', test_suite)
    typescript_paths = [{
        'name': 'conductor',
        'path': CONDUCTOR_DIRECTORY
    }, {
        'name': 'shared',
        'path': shared_path
    }, {
        'name': 'suite',
        'path': test_suite_path
    }]

    errors_found = False
    try:
        errors_found = compile_typescript(typescript_paths)
        if (errors_found):
            raise Exception('Typescript failed to compile')
        test_suite_list_path = os.path.join(test_suite_path, 'test-list.js')
        errors_found = run_tests(chrome_binary, chrome_features, test_suite, test_suite_list_path, test_file=test_file)
    except Exception as err:
        print(err)

    if errors_found:
        print('ERRORS DETECTED')
        sys.exit(1)


if __name__ == '__main__':
    run_test()
