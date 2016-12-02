#!/usr/bin/env bash

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$DEVTOOLS_ROOT"

python scripts/build/generate_protocol_externs.py -o "$PROTOCOL_EXTERNS_OUTPUT_FILE" "$BROWSER_PROTOCOL_JSON_FILE" "$V8_PROTOCOL_JSON_FILE"
echo "Generated fresh $PROTOCOL_EXTERNS_OUTPUT_FILE"

popd

popd
