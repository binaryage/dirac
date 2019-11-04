#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"
cd "$DEPOT_DIR"

gn --root=devtools-frontend gen out/Default

lein compile-dirac-pseudo-names

cp "$ROOT/target/resources/release/devtools/front_end/dirac/.compiled/implant/implant.js" devtools-frontend/front_end/dirac/.compiled/implant/implant.js

autoninja -C out/Default

# copy our stuff over

cd out/Default/resources/inspector

# copy our custom sources
FRONTEND="$ROOT/resources/unpacked/devtools/front_end"

set -x

cp "$FRONTEND/protocol/InspectorBackendExtensionMode.js" "protocol"
cp "$FRONTEND/sdk/SupportedCSSPropertiesExtensionMode.js" "sdk"

####

echo "--custom-devtools-frontend=file://$ROOT/$DEPOT_DIR/out/Default/resources/inspector"
