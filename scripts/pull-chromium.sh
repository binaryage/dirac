#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$CHROMIUM_MIRROR_DIR"

git checkout master
git pull

gclient sync

popd
