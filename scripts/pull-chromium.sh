#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$CHROMIUM_MIRROR_DIR"

git checkout master
git pull
git clean -fd

gclient sync --with_branch_heads --reset --delete_unversioned_trees
git fetch --tags

popd
