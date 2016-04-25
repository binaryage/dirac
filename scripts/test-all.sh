#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

# we want to prevent clashes between:
#   *  chrome instance for developing tests (port 9333)
#   *  chrome instance for automated tests (port 9444)
#   *  and ad-hoc chrome instances with default (port 9222)
export DIRAC_CHROME_REMOTE_DEBUGGING_PORT=9444

./scripts/ensure-checkouts.sh

echo "Running all backend tests..."
lein test-backend

echo "Running all browser tests..."
lein test-browser

popd