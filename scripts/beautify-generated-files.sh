#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

set -x
js-beautify -r "$INSPECTOR_BACKEND_COMMANDS_OUTPUT_FILE"
js-beautify -r "$CSS_PROPERTIES_OUTPUT_FILE"
js-beautify -r "$ARIA_PROPERTIES_OUTPUT_FILE"
