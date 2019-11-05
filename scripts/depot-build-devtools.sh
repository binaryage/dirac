#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

TASK=${1:-compile-dirac-pseudo-names}

cd "$ROOT"
cd "$DEPOT_DIR"

lein "$TASK"

IMPLANT_DIR="devtools-frontend/front_end/dirac/.compiled/implant"
mkdir -p "$IMPLANT_DIR"
cp "$ROOT/target/resources/release/devtools/front_end/dirac/.compiled/implant/implant.js" "$IMPLANT_DIR"

"$SCRIPTS/depot-ninja.sh"

echo "--custom-devtools-frontend=file://$ROOT/$DEPOT_DIR/out/Default/resources/inspector"
