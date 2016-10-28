#!/usr/bin/env bash

set -e

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

OUT_PATH="$CHROMIUM_MIRROR_DIR/out/Release"
OUT_INSPECTOR="$OUT_PATH/resources/inspector"
OUT_DIRAC="$OUT_INSPECTOR/dirac"

pushd "$ROOT"

echo "note: you might want to run compile-blink-tests.sh first"

ninja -C ${OUT_PATH} -t clean devtools_frontend_resources

lein compile-dirac-pseudo-names

mkdir -p "$OUT_DIRAC"
cp -r "$ROOT/target/resources/release/devtools/front_end/dirac/.compiled" "$OUT_DIRAC" # produced by `lein compile-dirac`

echo "linking dirac devtools into chrome"
"$SCRIPTS/symlink-dirac-devtools-in-chrome.sh"

function cleanup {
  echo "unlinking dirac devtools from chrome"
  "$SCRIPTS/unlink-dirac-devtools-in-chrome.sh"
}
trap cleanup EXIT

pushd "$DEVTOOLS_SCRIPTS"
./run_inspector_tests.sh "$@"
popd

popd

popd
