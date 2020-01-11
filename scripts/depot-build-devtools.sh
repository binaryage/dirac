#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

TASK=${1:-compile-dirac-pseudo-names}

cd "$ROOT"

lein "$TASK"

cd "$DEPOT_DIR"

"$SCRIPTS/depot-ninja.sh"
