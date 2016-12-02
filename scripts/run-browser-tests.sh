#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

echo "Running browser tests..."
lein with-profile +test-runner trampoline run -m "$@" 2>&1 | grep --line-buffered -vE "(org\.openqa\.selenium\.remote\.ProtocolHandshake|assuming Postel|INFO: Detected dialect)"

popd

popd
