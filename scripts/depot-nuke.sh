#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

if [[ -d "$DEPOT_DIR" ]]; then
  rm -rf "$DEPOT_DIR"
fi
