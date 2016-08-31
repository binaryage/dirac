#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

#./scripts/ensure-checkouts.sh

lein test-backend
lein test-browser

popd

popd
