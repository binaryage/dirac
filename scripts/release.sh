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
# - compile dirac extension into target/resources/release/_compiled
# - compile implant into target/resources/release/devtools/front_end/dirac/_compiled
# - move existing sources in resources/unpacked into a temp folder
# - zero dirac/require-implant.js in the temp folder
# - run build_release_applications.py on the files in temp folder as input, output to resources/release
# - move static resources to resources/release
# - copy compiled code to appropriate places in resources/release
# - remove unneeded files from resources/release

set -e

TASK=${1:-compile-dirac}

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$ROOT"

./scripts/check-versions.sh

if [ -z "$RELEASE_BUILD_DEVTOOLS" ] ; then
  echo "invalid config: RELEASE_BUILD_DEVTOOLS env var is empty"
  exit 111
fi

if [ -z "$RELEASE_BUILD_COMPILED" ] ; then
  echo "invalid config: RELEASE_BUILD_COMPILED env var is empty"
  exit 112
fi

if [ -d "$RELEASE_BUILD_COMPILED" ] ; then
  rm -rf "$RELEASE_BUILD_COMPILED"
fi
if [ -d "$RELEASE_BUILD_DEVTOOLS" ] ; then
  rm -rf "$RELEASE_BUILD_DEVTOOLS"
fi
if [ ! -d "$RELEASE_BUILD_DEVTOOLS_FRONTEND" ] ; then
  mkdir -p "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
fi

FRONTEND="$DEVTOOLS_ROOT/front_end"

echo "Building dirac extension in advanced mode..."
lein ${TASK}

popd

pushd "$DEVTOOLS_ROOT"

# http://stackoverflow.com/a/34676160/84283
WORK_DIR=`mktemp -q -d /tmp/dirac-build-XXXXXXX`
if [ $? -ne 0 ]; then
  echo "$0: Can't create temp file, exiting..."
  exit 1
fi

function cleanup {
  if [[ "$WORK_DIR" == /tmp/dirac-build-* ]] ; then  # this is just a paranoid test if something went terribly wrong and mktemp returned "/" or something non-tmp-ish
    rm -rf "$WORK_DIR"
    # echo "Deleted temp working directory $WORK_DIR"
  else
    echo "Unexpected temporary directory. Delete it manually '$WORK_DIR'."
  fi
}
trap cleanup EXIT

mkdir -p "$WORK_DIR"

cp -r "$FRONTEND"/* "$WORK_DIR"

# the compiled dir might exist because of dev build
WORK_DIR_DIRAC_COMPILED="$WORK_DIR/dirac/_compiled"
if [ -d "$WORK_DIR_DIRAC_COMPILED" ] ; then
  rm -rf "$WORK_DIR_DIRAC_COMPILED"
fi
cp -r "$ROOT/target/resources/release/devtools/front_end/dirac/_compiled" "$WORK_DIR/dirac" # produced by `lein compile-dirac`

echo -n "" > "$WORK_DIR/dirac/require-implant.js" # when doing advanced build, all implant files are required automatically

echo "Building devtools in advanced mode..."
# DANGER! this list of applications must be the same as specified in resources/unpacked/devtools/BUILD.gn (search for "-- darwin")
./scripts/build_release_applications.py inspector toolbox formatter_worker heap_snapshot_worker temp_storage_shared_worker \
                                        --input_path "$WORK_DIR" --output_path "$RELEASE_BUILD_DEVTOOLS_FRONTEND" --debug 0

popd

pushd "$ROOT"

# copy static resources
# this should be kept in sync with devtools_frontend_resources target of devtools.gyp
cp -r "$FRONTEND/Images" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
cp -r "$FRONTEND/emulated_devices" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"
cp "$FRONTEND/devtools.js" "$RELEASE_BUILD_DEVTOOLS_FRONTEND"

# copy compiled extension code (produced by `lein compile-dirac`)
cp -r "$ROOT/target/resources/release/_compiled" "$RELEASE_BUILD"

# ad-hoc cleanup
rm -rf "$RELEASE_BUILD_DEVTOOLS_FRONTEND/dirac"
rm -rf "$RELEASE_BUILD_DEVTOOLS_FRONTEND/Images/src"

rm -rf "$RELEASE_BUILD/_compiled/background"
rm -rf "$RELEASE_BUILD/_compiled/options"

popd

popd
