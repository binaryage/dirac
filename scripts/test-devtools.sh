#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$DEVTOOLS_ROOT"

npm install
npm test

popd

popd
