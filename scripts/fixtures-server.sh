#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$FIXTURES_SERVER_ROOT"

python -m SimpleHTTPServer "$FIXTURES_SERVER_PORT"

popd