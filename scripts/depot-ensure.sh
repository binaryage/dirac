#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$DEPOT_DIR"

if [[ -d "$DEPOT_DIR" ]]; then
  exit 0
fi

set -x
exec "$SCRIPTS/depot-bootstrap.sh"
