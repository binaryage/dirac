#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$DEVTOOLS_ROOT"

python scripts/build/generate_protocol_externs.py -o "$PROTOCOL_EXTERNS_OUTPUT_FILE" "$BROWSER_PROTOCOL_JSON_FILE" "$V8_PROTOCOL_JSON_FILE"
echo "Generated fresh $PROTOCOL_EXTERNS_OUTPUT_FILE"

popd
