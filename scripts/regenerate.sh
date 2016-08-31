#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

./scripts/pull-chromium.sh
./scripts/generate-protocol-json.sh
./scripts/generate-inspector-backend-commands.sh
./scripts/generate-supported-css-properties.sh
./scripts/generate-protocol-externs.sh

popd

popd
