#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$DEVSERVER_ROOT"

python -m SimpleHTTPServer "$DEVSERVER_PORT"

popd

popd
