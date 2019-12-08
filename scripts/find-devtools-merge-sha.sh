#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

START_SHA=${1:-HEAD}

git rev-parse "$START_SHA^{/merge updates from official devtools}"
