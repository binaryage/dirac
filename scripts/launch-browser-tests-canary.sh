#!/usr/bin/env bash

set -ex

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

if [ ! -d "$DIRAC_BROWSER_TESTS_USER_PROFILE" ] ; then
  mkdir -p "$DIRAC_BROWSER_TESTS_USER_PROFILE"
fi

if [ ! -z "$1" ] ; then
  EXE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
  EXE="/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
fi

"$EXE" \
      --remote-debugging-port=9222 \
      --no-first-run \
      --user-data-dir="$DIRAC_BROWSER_TESTS_USER_PROFILE" \
      --enable-experimental-extension-apis \
      localhost:9222/json

popd