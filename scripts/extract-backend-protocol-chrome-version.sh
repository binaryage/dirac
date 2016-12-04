#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

SHA=${1:-HEAD}

git show ${SHA}:resources/unpacked/devtools/front_end/InspectorBackendCommands.js | head -n 1 | cut -d "=" -f 2 | sed -e "s/[';]//g"

popd
