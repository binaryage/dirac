#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

SHA=${1:-HEAD}

# for some reason the next line started returning with error (probably git regression/change of behaviour)
set +e +o pipefail
git show "${SHA}:resources/unpacked/devtools/front_end/InspectorBackendCommands.js" | head -n 1 | cut -d "=" -f 2 | sed -e "s/[';]//g"
