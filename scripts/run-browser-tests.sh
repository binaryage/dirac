#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

echo "Running browser tests..."
print_env

lein with-profile +test-runner trampoline run -m "$@" 2>&1 | grep --line-buffered -vE "(org\.openqa\.selenium\.remote\.ProtocolHandshake|assuming Postel|INFO: Detected dialect)"

popd
