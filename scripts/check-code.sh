#!/usr/bin/env bash

# check our devtools code for google closure annotations and Chromium coding conventions

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

set -x

cd "$DEVTOOLS_ROOT"

yarn check-gn
#yarn check-grdp
#yarn check-json
yarn check-loc

#yarn closure
