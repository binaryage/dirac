#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

if [[ ! -d "$DIRAC_USER_PROFILE2" ]]; then
  mkdir -p "$DIRAC_USER_PROFILE2"
fi

if [[ -n "$1" ]]; then
  EXE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
  EXE="/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
fi

"$EXE" \
      --no-first-run \
      --disable-infobars \
      --disable-default-apps \
      --user-data-dir="$DIRAC_USER_PROFILE2" \
      "--custom-devtools-frontend=file://$ROOT/resources/release/devtools/front_end"
