#!/usr/bin/env bash

# checkouts folders must exist for cljs compiler to be happy
# they can be empty and that should be perfectly fine

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

pushd "$ROOT"

mkdir -p "checkouts/cljs-devtools"
mkdir -p "checkouts/chromex"

popd