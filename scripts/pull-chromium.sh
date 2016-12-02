#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$CHROMIUM_MIRROR_DIR"

git checkout master
git pull

gclient sync

popd

popd
