#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

echo "Running all backend tests..."
lein test-backend

echo "Running all browser tests..."
lein test-browser

popd