#!/usr/bin/env bash

# checkouts folders mentioned in :source-paths must exist for cljs compiler to be happy
# they can be empty and that should be perfectly fine

source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
false && source config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$ROOT"

mkdir -p "checkouts/cljs-devtools/src"
mkdir -p "checkouts/chromex/src/lib"
mkdir -p "checkouts/chromex/src/exts"

popd
