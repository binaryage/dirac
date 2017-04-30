#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

echo "Running browser tests..."
lein with-profile +test-runner trampoline run -m "$@" 2>&1 | awk -f "$SCRIPTS/browser-tests-output-filter.awk"

popd
