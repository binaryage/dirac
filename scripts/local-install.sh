#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

LIB_PROFILE=${1:-lib}

./scripts/list-jar.sh "${LIB_PROFILE}"

lein with-profile "${LIB_PROFILE}" install
