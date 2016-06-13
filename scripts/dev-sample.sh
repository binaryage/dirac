#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$DIRAC_SAMPLE_DIR"

lein dev

popd
