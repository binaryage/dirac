#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"
cd "$DEPOT_DIR"

lein compile-dirac-pseudo-names
cp "$ROOT/target/resources/release/devtools/front_end/dirac/.compiled/implant/implant.js" devtools-frontend/front_end/dirac/.compiled/implant/implant.js

"$SCRIPTS/depot-ninja.sh"

# copy our stuff over

cd out/Default/resources/inspector

####

echo "--custom-devtools-frontend=file://$ROOT/$DEPOT_DIR/out/Default/resources/inspector"
