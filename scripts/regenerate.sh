#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

"$SCRIPTS/depot-sync.sh"
"$SCRIPTS/depot-clean.sh"
"$SCRIPTS/depot-ninja.sh"

#./scripts/pull-chromium.sh
#./scripts/generate-protocol-json.sh
#./scripts/generate-inspector-backend-commands.sh
#./scripts/generate-supported-css-properties.sh
#./scripts/generate-protocol-externs.sh
#./scripts/generate-namespaces-externs.sh
#./scripts/generate-aria-properties.sh
