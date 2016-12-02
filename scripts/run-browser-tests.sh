#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

echo "Running browser tests..."
lein with-profile +test-runner run -m "$@" 2>&1 | grep -vE "(org\.openqa\.selenium\.remote\.ProtocolHandshake|assuming Postel|INFO: Detected dialect)"

popd

popd
