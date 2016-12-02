#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$DEV_FIXTURES_SERVER_ROOT"

echo "launching fixtures server for development (silent mode) in '$DEV_FIXTURES_SERVER_ROOT' on port $DEV_FIXTURES_SERVER_PORT"

python -m SimpleHTTPServer "$DEV_FIXTURES_SERVER_PORT" >/dev/null 2>&1

popd

popd
