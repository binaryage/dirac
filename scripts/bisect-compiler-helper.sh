#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

# running in clojurescript compiler checkout
NO_CLJS_COMPILER_CLEAN=${NO_CLJS_COMPILER_CLEAN}
NO_CLJS_COMPILER_BOOTSTRAP=${NO_CLJS_COMPILER_BOOTSTRAP}
NO_CLJS_COMPILER_BUILD=${NO_CLJS_COMPILER_BUILD}

export CLJS_SCRIPT_QUIET=1

if [[ -z "${NO_CLJS_COMPILER_CLEAN}" ]]; then
  echo "cleaning compiler..."
  ./script/clean > /dev/null
fi
if [[ -z "${NO_CLJS_COMPILER_BOOTSTRAP}" ]]; then
  echo "bootstrapping compiler..."
  ./script/bootstrap > /dev/null
fi
if [[ -z "${NO_CLJS_COMPILER_BUILD}" ]]; then
  echo "building compiler..."
  ./script/build > /dev/null
fi

COMPILER_VERSION=$(cat src/main/cljs/cljs/core.cljs | grep '*clojurescript-version*' | cut -d ' ' -f 3 | cut -d '"' -f 2)
SEPARATOR="================================================================================================================="

cd "${ROOT}"

echo ${SEPARATOR}
echo "working with ClojureScript compiler version $COMPILER_VERSION"

STATUS=255

finish () {
  echo ${SEPARATOR}

  git reset --hard
  git clean -fd
  exit ${STATUS}
}

trap finish EXIT

set +e
./scripts/bisect-compiler-test.sh "$COMPILER_VERSION"
STATUS=$?
set -e

if [[ "$STATUS" -eq "0" ]]; then
    echo "ClojureScript compiler $COMPILER_VERSION PASSED!"
else
    echo "ClojureScript compiler $COMPILER_VERSION FAILED!"
fi
