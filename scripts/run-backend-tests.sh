#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

echo "Running backend tests..."
lein run-backend-tests-17
lein run-backend-tests-18
lein run-backend-tests-19

popd
