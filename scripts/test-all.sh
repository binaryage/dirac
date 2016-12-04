#!/usr/bin/env bash

if [ -n "$SKIP_DIRAC_TESTS" ] ; then
  echo "skipping tests due to SKIP_DIRAC_TESTS"
  exit 0
fi

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

redirect_to_test_stage_if_needed

pushd "$ROOT"

./scripts/test-backend.sh
./scripts/test-browser.sh

popd
