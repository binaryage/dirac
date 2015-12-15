#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

if [ ! -d "$DIRAC_USER_PROFILE" ] ; then
  mkdir -p "$DIRAC_USER_PROFILE"
fi

/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
      --remote-debugging-port=9222 \
      --no-first-run \
      --user-data-dir="$DIRAC_USER_PROFILE" \
      localhost:9222/json

popd