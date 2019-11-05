#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

if [[ -d "$DEPOT_DIR" ]]; then
  echo "depot already exists at '$DEPOT_DIR', use depot-nuke.sh to remove it first"
  exit 1
fi

mkdir -p "$DEPOT_DIR"

cd "$DEPOT_DIR"

ln -s "../dirac" dirac
ln -s "../dirac/resources/unpacked/devtools" "devtools-frontend"

gclient config https://github.com/binaryage/dirac.git --unmanaged --deps-file="resources/unpacked/devtools/DEPS"

# do initial sync
"$SCRIPTS/depot-sync.sh"
