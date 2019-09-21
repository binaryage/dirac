#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$CHROMIUM_MIRROR_DIR"

git checkout master
git pull
git clean -fd

gclient sync --with_branch_heads --reset --delete_unversioned_trees
git fetch --tags
