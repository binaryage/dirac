#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$DEVTOOLS_WORKTREE"

git pull

popd

popd
