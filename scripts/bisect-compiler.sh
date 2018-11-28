#!/usr/bin/env bash

# this will run browser tests against fully optimized dirac extension (release build)

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

CLOJURESCRIPT_REPO_DIR=${CLOJURESCRIPT_REPO_DIR:-$HOME/farm/clojurescript}

echo "ClojureScript compiler repo dir is '${CLOJURESCRIPT_REPO_DIR}'"

cd ${CLOJURESCRIPT_REPO_DIR}

git bisect start "$@"
git bisect run "$SCRIPTS/bisect-compiler-helper.sh"
