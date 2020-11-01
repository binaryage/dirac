#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

TASK=${1:-compile-dirac-pseudo-names}
INCREMENTAL=${DIRAC_INCREMENTAL_RELEASE}

TMP_RELEASE_BUILD="$DEPOT_DIR/out/Default/resources/inspector"

cd "$ROOT"

set -x

if [[ -z "$INCREMENTAL" ]]; then
  "$SCRIPTS/check-versions.sh"
  "$SCRIPTS/clean-target.sh"
  "$SCRIPTS/depot-clean.sh"
  "$SCRIPTS/depot-sync.sh"
fi

IMPLANTED_JS="$RELEASE_BUILD/devtools/front_end/shell.js"

# make sure we rebuild the js file from scratch
if [[ -f "$IMPLANTED_JS" ]]; then
  rm "$IMPLANTED_JS"
fi
"$SCRIPTS/depot-build-devtools.sh" "$TASK"

if [[ -z "$DIRAC_INCREMENTAL_RELEASE" ]]; then
  rm -rf "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
fi
mkdir -p "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
rsync -a "$TMP_RELEASE_BUILD/." "$RELEASE_BUILD_DEVTOOLS_FRONTEND"

# copy compiled extension code (produced by `lein compile-dirac`)
cp "$ROOT/target/resources/release/.compiled/background.js" "$RELEASE_BUILD/background.js"
cp "$ROOT/target/resources/release/.compiled/options.js" "$RELEASE_BUILD/options.js"

# concat bundled implant.js with shell.js
echo ";/* DIRAC IMPLANT >> */" >>"$IMPLANTED_JS"
cat "$ROOT/target/resources/release/devtools/front_end/dirac/.compiled/implant/implant.js" >>"$IMPLANTED_JS"

"$SCRIPTS/prune-release.sh"
