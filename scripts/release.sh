#!/usr/bin/env bash

# the goal is to build minified ready-to-be-released version into resources/release
# resources/release should be still working and we should be able to load it as unpacked extension for testing
# (our test tasks rely on it)
#
# for our code we use clojurescript with :advanced optimizations
# for devtools we use build_release_applications.py which does concatenation and minification of devtools files,
# it also embeds resource files and compiles lazy-loaded code into modules
#
# steps:
# - move some required destination files to resources/release
# - compile dirac extension into target/resources/release/.compiled
# - compile implant into target/resources/release/devtools/front_end/dirac/.compiled
# - move existing sources in resources/unpacked into a temp folder
# - zero dirac/require-implant.js in the temp folder
# - run build_release_applications.py on the files in temp folder as input, output to resources/release
# - move static resources to resources/release
# - copy compiled code to appropriate places in resources/release
# - remove unneeded files from resources/release

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

TASK=${1:-compile-dirac-pseudo-names}

cd "$ROOT"

./scripts/check-versions.sh

if [[ -z "$RELEASE_BUILD_DEVTOOLS" ]]; then
  echo "invalid config: RELEASE_BUILD_DEVTOOLS env var is empty"
  exit 111
fi

if [[ -f "$RELEASE_BUILD_COMPILED_BACKGROUND_JS" ]]; then
  rm "$RELEASE_BUILD_COMPILED_BACKGROUND_JS"
fi
if [[ -f "$RELEASE_BUILD_COMPILED_OPTIONS_JS" ]]; then
  rm "$RELEASE_BUILD_COMPILED_OPTIONS_JS"
fi
if [[ -d "$RELEASE_BUILD_DEVTOOLS" ]]; then
  rm -rf "$RELEASE_BUILD_DEVTOOLS"
fi
if [[ ! -d "$RELEASE_BUILD_DEVTOOLS_FRONTEND" ]]; then
  mkdir -p "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
fi

FRONTEND="$DEVTOOLS_ROOT/front_end"

echo "Building dirac extension in advanced mode..."
lein "${TASK}"

cd "$DEVTOOLS_ROOT"

# http://stackoverflow.com/a/34676160/84283
WORK_DIR=$(mktemp -q -d /tmp/dirac-build-XXXXXXX)
# shellcheck disable=SC2181
if [[ $? -ne 0 ]]; then
  echo "$0: Can't create temp file, exiting..."
  exit 1
fi

function cleanup {
  if [[ "$WORK_DIR" == /tmp/dirac-build-* ]]; then  # this is just a paranoid test if something went terribly wrong and mktemp returned "/" or something non-tmp-ish
    rm -rf "$WORK_DIR"
    # echo "Deleted temp working directory $WORK_DIR"
  else
    echo "Unexpected temporary directory. Delete it manually '$WORK_DIR'."
  fi
}
trap cleanup EXIT

WORK_DIR="$WORK_DIR/front_end" # a hack for input_path of copy_devtools_modules.py

mkdir -p "$WORK_DIR"

cp -r "$FRONTEND"/* "$WORK_DIR"

# the compiled dir might exist because of dev build
WORK_DIR_DIRAC_COMPILED="$WORK_DIR/dirac/.compiled"
if [[ -d "$WORK_DIR_DIRAC_COMPILED" ]]; then
  rm -rf "$WORK_DIR_DIRAC_COMPILED"
fi
cp -r "$ROOT/target/resources/release/devtools/front_end/dirac/.compiled" "$WORK_DIR/dirac" # produced by `lein compile-dirac`

echo -n "" > "$WORK_DIR/dirac/require-implant.js" # when doing advanced build, all implant files are required automatically

echo "Building devtools in advanced mode..."
# DANGER! this list of applications must be the same as specified in resources/unpacked/devtools/BUILD.gn (search for "-- darwin")
./scripts/build/build_release_applications.py \
  audits_worker \
  devtools_app \
  formatter_worker \
  heap_snapshot_worker \
  inspector \
  js_app \
  node_app \
  shell \
  toolbox \
  worker_app \
  --input_path "$WORK_DIR" \
  --output_path "$RELEASE_BUILD_DEVTOOLS_FRONTEND" \
  --debug 0

echo "Copying devtools modules..."

# DANGER! this list of applications must be the same as specified in resources/unpacked/devtools/BUILD.gn (see all_devtools_modules list)
mkdir -p "$RELEASE_BUILD_DEVTOOLS_FRONTEND/ui"
mkdir -p "$RELEASE_BUILD_DEVTOOLS_FRONTEND/common"
./scripts/build/copy_devtools_modules.py \
  front_end/root.js \
  front_end/ui/ARIAUtils.js \
  front_end/ui/ui.js \
  front_end/common/common.js \
  front_end/common/App.js \
  front_end/common/AppProvider.js \
  front_end/common/CharacterIdMap.js \
  front_end/common/Color.js \
  front_end/common/ContentProvider.js \
  front_end/common/EventTarget.js \
  front_end/common/JavaScriptMetaData.js \
  front_end/common/Linkifier.js \
  front_end/common/Object.js \
  front_end/common/Console.js \
  front_end/common/ParsedURL.js \
  front_end/common/Progress.js \
  front_end/common/QueryParamHandler.js \
  front_end/common/ResourceType.js \
  front_end/common/Revealer.js \
  front_end/common/Runnable.js \
  front_end/common/SegmentedRange.js \
  front_end/common/Settings.js \
  front_end/common/StaticContentProvider.js \
  front_end/common/StringOutputStream.js \
  front_end/common/TextDictionary.js \
  front_end/common/Throttler.js \
  front_end/common/Trie.js \
  front_end/common/UIString.js \
  front_end/common/Worker.js \
  --input_path "$WORK_DIR/.." \
  --output_path "$RELEASE_BUILD_DEVTOOLS_FRONTEND"

cd "$ROOT"

# copy handshake files
cp "$FRONTEND/handshake.html" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
cp "$FRONTEND/handshake.js" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"

# copy static resources
# this should be kept in sync with devtools_frontend_resources target of devtools.gyp
cp -r "$FRONTEND/Images" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
cp -r "$FRONTEND/emulated_devices" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
cp "$FRONTEND/devtools_compatibility.js" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"

# copy compiled extension code (produced by `lein compile-dirac`)
cp "$ROOT/target/resources/release/.compiled/background.js" "$RELEASE_BUILD/background.js"
cp "$ROOT/target/resources/release/.compiled/options.js" "$RELEASE_BUILD/options.js"

# ad-hoc cleanup
rm -rf "$RELEASE_BUILD_DEVTOOLS_FRONTEND/dirac"
rm -rf "$RELEASE_BUILD_DEVTOOLS_FRONTEND/Images/src"
