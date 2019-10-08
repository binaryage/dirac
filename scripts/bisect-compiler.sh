#!/usr/bin/env bash

# this will run browser tests against fully optimized dirac extension (release build)

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

CLOJURESCRIPT_REPO_DIR=${CLOJURESCRIPT_REPO_DIR:-$HOME/farm/clojurescript}

echo "ClojureScript compiler repo dir is '${CLOJURESCRIPT_REPO_DIR}'"

cd "${CLOJURESCRIPT_REPO_DIR}"

git bisect start "$@"
git bisect run "$SCRIPTS/bisect-compiler-helper.sh"
