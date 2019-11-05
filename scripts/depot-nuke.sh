#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

if [[ -d "$DEPOT_DIR" ]]; then
  rm -rf "$DEPOT_DIR"
fi

mkdir -p "$DEPOT_DIR"

cd "$DEPOT_DIR"

ln -s ".." dirac
ln -s "../resources/unpacked/devtools" "devtools-frontend"

gclient config https://github.com/binaryage/dirac.git --unmanaged --deps-file="$ROOT/resources/unpacked/devtools/DEPS"
