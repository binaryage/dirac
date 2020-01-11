#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

echo "Running backend tests..."
lein run-backend-tests-110
lein run-backend-tests-19
