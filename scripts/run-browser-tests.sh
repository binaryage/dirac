#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

echo "Running browser tests..."
lein with-profile +test-runner,+debugger run -m "$@"

popd

popd
