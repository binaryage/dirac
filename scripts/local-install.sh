#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

LIB_PROFILE=${1:-lib}

./scripts/list-jar.sh "${LIB_PROFILE}"

lein with-profile "${LIB_PROFILE}" install

popd
