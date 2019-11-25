# Copyright 2019 The Chromium Authors.  All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import argparse
import sys
import subprocess
import json
import os

from os import path
_CURRENT_DIR = path.join(path.dirname(__file__))
TSC_LOCATION = path.join(_CURRENT_DIR, '..', '..', 'node_modules', 'typescript', 'bin', 'tsc')

ROOT_TS_CONFIG_LOCATION = path.join(_CURRENT_DIR, 'tsconfig.json')


def runTsc(tsconfig_location):
    process = subprocess.Popen([TSC_LOCATION, '-b', tsconfig_location], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = process.communicate()
    # TypeScript does not correctly write to stderr because of https://github.com/microsoft/TypeScript/issues/33849
    return process.returncode, stdout + stderr


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-s', '--sources', nargs='*', required=True, help='List of TypeScript source files')
    parser.add_argument('-b', '--tsconfig_location', required=True)
    opts = parser.parse_args()
    with open(ROOT_TS_CONFIG_LOCATION) as root_tsconfig:
        try:
            tsconfig = json.loads(root_tsconfig.read())
        except Exception as e:
            print('Encountered error while loading root tsconfig:')
            print(e)
            return 1
    tsconfig_output_location = path.join(os.getcwd(), opts.tsconfig_location)
    tsconfig['files'] = [path.join(os.getcwd(), src) for src in opts.sources]
    tsconfig['compilerOptions']['outDir'] = path.dirname(tsconfig_output_location)
    with open(tsconfig_output_location, 'w') as generated_tsconfig:
        try:
            json.dump(tsconfig, generated_tsconfig)
        except Exception as e:
            print('Encountered error while writing generated tsconfig in location %s:' % tsconfig_output_location)
            print(e)
            return 1
    found_errors, stderr = runTsc(tsconfig_location=tsconfig_output_location)
    if found_errors:
        print('')
        print('TypeScript compilation failed. Used tsconfig %s' % tsconfig_output_location)
        print('')
        print(stderr)
        print('')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
