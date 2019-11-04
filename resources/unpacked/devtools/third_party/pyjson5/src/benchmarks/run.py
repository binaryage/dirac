#!/usr/bin/env python
# Copyright 2017 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from __future__ import print_function

import argparse
import json
import os
import sys
import time

THIS_DIR = os.path.abspath(os.path.dirname(__file__))
REPO_DIR  = os.path.dirname(THIS_DIR)
if not REPO_DIR in sys.path:
    sys.path.insert(0, REPO_DIR)

import json5

ALL_BENCHMARKS = (
    'ios-simulator.json',
    'mb_config.json',
    'chromium.linux.json',
    'chromium.perf.json',
)

DEFAULT_ITERATIONS = 1

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pure', action='store_true')
    parser.add_argument('-n', '--num-iterations', default=DEFAULT_ITERATIONS,
                        type=int)
    parser.add_argument('benchmarks', nargs='*')
    args = parser.parse_args()
    if not args.benchmarks:
        args.benchmarks = [os.path.join(THIS_DIR, d) for d in ALL_BENCHMARKS]

    file_contents = []
    for f in args.benchmarks:
        with open(f) as fp:
            file_contents.append(fp.read())


    # json.decoder.c_scanstring = py_scanstring
    def py_maker(*_args, **_kwargs):
      decoder = json.JSONDecoder()
      decoder.scan_once = json.scanner.py_make_scanner(decoder)
      decoder.parse_string = json.decoder.py_scanstring
      json.decoder.scanstring = decoder.parse_string
      return decoder

    maker = py_maker if args.pure else json.JSONDecoder

    all_times = []
    for i, c in enumerate(file_contents):
        times = []
        for _ in range(args.num_iterations):
            start = time.time()
            json_obj = json.loads(c, cls=maker)
            mid = time.time()
            json5_obj = json5.loads(c)
            end = time.time()

            json_time = mid - start
            json5_time = end - mid
            times.append((json_time, json5_time))
            assert(json5_obj == json_obj)
        all_times.append(times)

    for i, times in enumerate(all_times):
        avg = sum((json5_time / json_time)
                  for json_time, json5_time in times) / args.num_iterations
        print("%-20s: %5.1f" % (args.benchmarks[i], avg))

    return 0


if __name__ == '__main__':
    sys.exit(main())
