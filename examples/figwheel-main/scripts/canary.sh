#!/usr/bin/env bash

# shellcheck source=_shared.sh
source "$(dirname "${BASH_SOURCE[0]}")/_shared.sh"

exec /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
      --remote-debugging-port=9222 \
      --no-first-run \
      --user-data-dir=.test-dirac-chrome-profile