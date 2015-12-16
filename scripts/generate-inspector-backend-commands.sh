#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$DEVTOOLS_ROOT"

python scripts/CodeGeneratorFrontend.py protocol.json --output_js_dir "$DEVTOOLS_ROOT/front_end"

popd