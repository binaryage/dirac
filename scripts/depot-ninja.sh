#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$DEPOT_DIR"

gn --root=devtools-frontend gen out/Default

autoninja -C out/Default

"$SCRIPTS/beautify-generated-files.sh"
