#!/usr/bin/env bash

set -e

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

# we want to pre-compile our extensions, so that --load-extension param does not fail
lein compile-marion
lein compile-dirac-dev

set -x
"$EXE" \
      --remote-debugging-port=9222 \
      --user-data-dir="$DIRAC_BROWSER_TESTS_USER_PROFILE" \
      --no-first-run \
      --enable-experimental-extension-apis \
      --disk-cache-dir=/dev/null \
      --media-cache-dir=/dev/null \
      --disable-hang-monitor \
      --disable-prompt-on-repost \
      --dom-automation \
      --full-memory-crash-report \
      --no-default-browser-check \
      --load-extension="$DEV_DIRAC_EXTENSION_PATH,$DEV_MARION_EXTENSION_PATH" \
      http://localhost:$DEV_FIXTURES_SERVER_PORT
set +x

popd