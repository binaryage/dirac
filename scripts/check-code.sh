#!/usr/bin/env bash

# check our devtools code for google closure annotations and Chromium coding conventions

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$DEVTOOLS_ROOT"

# http://stackoverflow.com/questions/107705/disable-output-buffering
python -u scripts/compile_frontend.py
