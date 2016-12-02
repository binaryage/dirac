#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

echo "Running backend tests..."
lein run-backend-tests-17
lein run-backend-tests-18
lein run-backend-tests-19

popd

popd
