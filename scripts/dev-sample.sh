#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$DIRAC_SAMPLE_DIR"

lein dev

popd

popd
