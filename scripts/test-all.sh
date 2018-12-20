#!/usr/bin/env bash

if [[ -n "$SKIP_DIRAC_TESTS" ]] ; then
  echo "skipping tests due to SKIP_DIRAC_TESTS"
  exit 0
fi

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

redirect_to_test_stage_if_needed

export LEIN_FAST_TRAMPOLINE=  # lein trampoline caches might get confused in test stage

pushd "$ROOT"

./scripts/test-backend.sh
./scripts/test-browser.sh "$@"

popd
