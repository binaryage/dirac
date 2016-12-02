#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

SHA=${1:-HEAD}

git show ${SHA}:resources/unpacked/devtools/front_end/InspectorBackendCommands.js | head -n 1 | cut -d "=" -f 2 | sed -e "s/[';]//g"

popd

popd
