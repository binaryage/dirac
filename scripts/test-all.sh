#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

#./scripts/ensure-checkouts.sh

lein test-backend
lein test-browser

popd
