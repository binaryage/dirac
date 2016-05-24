#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

./scripts/generate-inspector-backend-commands.sh
./scripts/generate-supported-css-properties.sh
./scripts/generate-protocol-externs.sh

popd