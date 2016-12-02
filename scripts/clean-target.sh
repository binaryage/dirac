#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

rm -rf "target"

popd

popd
