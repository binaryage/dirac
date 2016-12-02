#!/usr/bin/env bash

# checkouts folders mentioned in :source-paths must exist for cljs compiler to be happy
# they can be empty and that should be perfectly fine

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

mkdir -p "checkouts/cljs-devtools/src"
mkdir -p "checkouts/chromex/src/lib"
mkdir -p "checkouts/chromex/src/exts"

popd

popd
