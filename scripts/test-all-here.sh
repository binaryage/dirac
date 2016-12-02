#!/usr/bin/env bash

if [ -n "$SKIP_DIRAC_TESTS" ] ; then
  echo "skipping tests due to SKIP_DIRAC_TESTS"
  exit 0
fi

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

./scripts/test-backend-here.sh
./scripts/test-browser-here.sh

popd

popd
