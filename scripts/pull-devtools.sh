#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$DEVTOOLS_WORKTREE"

git pull

popd