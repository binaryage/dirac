#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

"$SCRIPTS/depot-sync.sh"
"$SCRIPTS/depot-clean.sh"
"$SCRIPTS/depot-ninja.sh"
