#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

if [ ! -d "$DIRAC_USER_PROFILE" ] ; then
  mkdir -p "$DIRAC_USER_PROFILE"
fi

if [ ! -z "$1" ] ; then
  EXE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
  EXE="/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
fi

"$EXE" \
      --remote-debugging-port=9222 \
      --no-first-run \
      --disable-infobars \
      --disable-default-apps \
      --user-data-dir="$DIRAC_USER_PROFILE" \
      localhost:9222/json

popd

popd
