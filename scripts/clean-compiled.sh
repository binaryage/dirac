#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

./scripts/clear-notify.sh

rm -rf "resources/unpacked/.compiled"
rm -rf "resources/unpacked/devtools/front_end/dirac/.compiled"
rm -rf "test/browser/fixtures/resources/.compiled"
rm -rf "test/marion/resources/unpacked/.compiled"
