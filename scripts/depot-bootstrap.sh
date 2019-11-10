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
## this is a workaround for https://github.com/binaryage/dirac/commit/655b5b89c95529c611dc180da7bc9ab21bf8015d
#ln -s "../dirac/resources/unpacked/devtools/buildtools" buildtools

gclient config https://github.com/binaryage/dirac.git --unmanaged --deps-file="resources/unpacked/devtools/DEPS"

# do initial sync
"$SCRIPTS/depot-sync.sh"
