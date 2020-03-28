#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$DEPOT_DIR"

"$SCRIPTS/depot-ensure.sh"

# we don't need to run hooks for our purposes
set -x
exec gclient sync --no-history --nohooks
