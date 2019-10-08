#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

export CHROME_LOG_FILE="$ROOT/target/chrome_debug.log"

echo "Running browser tests..."
lein with-profile +test-runner trampoline run -m "$@" 2>&1
