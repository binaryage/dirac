#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$DEVSERVER_ROOT"

python -m SimpleHTTPServer "$DEVSERVER_PORT"

popd