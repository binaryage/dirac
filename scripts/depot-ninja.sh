#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$DEPOT_DIR"

IMPLANT_FILE="$DEVTOOLS_ROOT/front_end/dirac/.compiled/implant/implant.js"

# in case implant.js does not exist, we create a dummy file for it
# it is not needed when this script is called from regenerate.sh
if [[ ! -f "$IMPLANT_FILE" ]]; then
  mkdir -p "$DEVTOOLS_ROOT/front_end/dirac/.compiled/implant"
  touch "$IMPLANT_FILE"
fi

gn --root=devtools-frontend gen out/Default

autoninja -C out/Default

"$SCRIPTS/beautify-generated-files.sh"
