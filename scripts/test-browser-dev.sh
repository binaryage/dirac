#!/usr/bin/env bash

set -e

# this will run browser tests against unpacked dirac extension

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

lein compile-browser-tests
lein compile-marion
lein compile-dirac-dev
lein run-browser-tests-dev

popd
