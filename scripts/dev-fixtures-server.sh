#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$DEV_FIXTURES_SERVER_ROOT"

python -m SimpleHTTPServer "$DEV_FIXTURES_SERVER_PORT"

popd