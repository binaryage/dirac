#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$DEV_FIXTURES_SERVER_ROOT"

echo "launching fixtures server for development (silent mode) in '$DEV_FIXTURES_SERVER_ROOT' on port $DEV_FIXTURES_SERVER_PORT"

python -m SimpleHTTPServer "$DEV_FIXTURES_SERVER_PORT" >/dev/null 2>&1

popd
