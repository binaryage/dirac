#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$DEVTOOLS_ROOT"

python scripts/build/generate_protocol_externs.py -o "$PROTOCOL_EXTERNS_OUTPUT_FILE" "$BROWSER_PROTOCOL_JSON_FILE" "$V8_PROTOCOL_JSON_FILE"
echo "Generated fresh $PROTOCOL_EXTERNS_OUTPUT_FILE"
