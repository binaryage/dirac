#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

CURRENT_CHECKSUM=$(shasum -p -a 256 "dirac" | cut -d " " -f 1)

echo "$CURRENT_CHECKSUM"

sed -i "" -e "s/{DIRAC_INSTALL_EXPECTED_CHECKSUM:-.*}/{DIRAC_INSTALL_EXPECTED_CHECKSUM:-$CURRENT_CHECKSUM}/g" "install"
