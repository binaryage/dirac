#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

set -x

die_if_dirty_working

cd "$DEVTOOLS_FRONTEND_DIR"
# assume:
# git remote add official https://github.com/ChromeDevTools/devtools-frontend.git
git fetch official
git merge official/master
