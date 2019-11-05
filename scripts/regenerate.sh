#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

"$SCRIPTS/depot-sync.sh"
"$SCRIPTS/depot-clean.sh"
"$SCRIPTS/depot-ninja.sh"

TMP_RELEASE_BUILD="$DEPOT_DIR/out/Default/resources/inspector"
DEV_FRONTEND="resources/unpacked/devtools/front_end"

set -x
cp "$TMP_RELEASE_BUILD/SupportedCSSProperties.js" "$DEV_FRONTEND"
cp "$TMP_RELEASE_BUILD/InspectorBackendCommands.js" "$DEV_FRONTEND"
cp "$TMP_RELEASE_BUILD/accessibility/ARIAProperties.js" "$DEV_FRONTEND/accessibility"
