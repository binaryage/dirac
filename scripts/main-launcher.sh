#!/usr/bin/env bash

# this script tries to launch dirac.main from command line
#
# usage ./main-launcher.sh [args]
#

set -e

VERSION=${DIRAC_MAIN_VERSION:-LATEST} # e.g. 0.1.0 or LATEST
GROUP=${DIRAC_MAIN_GROUP:-binaryage}
ARTIFACT=${DIRAC_MAIN_ARTIFACT:-dirac}

DIRAC_DEP=${DIRAC_MAIN_DIRAC_DEP:-"{$GROUP/$ARTIFACT {:mvn/version \"$VERSION\"}}"}
DEPS=${DIRAC_MAIN_DEPS:-"{:deps $DIRAC_DEP}"}
CLI_NS=${DIRAC_MAIN_CLI_NS:-"dirac.main"}

# $DEPS should be something like '{:deps {binaryage/dirac {:mvn/version "LATEST"}}}'
set -x
exec clojure -Sdeps "$DEPS" -m "$CLI_NS" "$@"
