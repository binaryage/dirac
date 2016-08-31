#!/usr/bin/env bash

set -e

# this will run browser tests against fully optimized dirac extension (release build)

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

lein compile-browser-tests
lein compile-marion
./scripts/release.sh compile-dirac-pseudo-names
lein run-browser-tests # = compile-dirac and devtools plus some cleanup, see scripts/release.sh

popd
