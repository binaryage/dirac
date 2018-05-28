#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

./scripts/pull-chromium.sh
./scripts/generate-protocol-json.sh
./scripts/generate-inspector-backend-commands.sh
./scripts/generate-supported-css-properties.sh
./scripts/generate-protocol-externs.sh
./scripts/generate-namespaces-externs.sh
./scripts/generate-aria-properties.sh

popd
