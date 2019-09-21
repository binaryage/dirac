#!/usr/bin/env bash

# checkouts folders mentioned in :source-paths must exist for cljs compiler to be happy
# they can be empty and that should be perfectly fine

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

mkdir -p "checkouts/cljs-devtools/src"
mkdir -p "checkouts/chromex/src/lib"
mkdir -p "checkouts/chromex/src/exts"
