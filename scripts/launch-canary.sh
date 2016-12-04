#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

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
