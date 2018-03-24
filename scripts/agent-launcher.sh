#!/usr/bin/env bash

# this script tries to launch dirac agent from command line
#
# usage ./agent-launcher.sh [args]
#

set -e

VERSION=${DIRAC_AGENT_VERSION:-LATEST} # e.g. 0.1.0 or LATEST
GROUP=${DIRAC_AGENT_GROUP:-binaryage}
ARTIFACT=${DIRAC_AGENT_ARTIFACT:-dirac}

DIRAC_DEP=${DIRAC_AGENT_DIRAC_DEP:-"{$GROUP/$ARTIFACT {:mvn/version \"$VERSION\"}}"}
DEPS=${DIRAC_AGENT_DEPS:-"{:deps $DIRAC_DEP}"}
CLI_NS=${DIRAC_AGENT_CLI_NS:-"dirac.agent.cli"}

# $DEPS should be something like '{:deps {binaryage/dirac {:mvn/version "LATEST"}}}'
exec clojure -Sdeps "$DEPS" -m "$CLI_NS" "$@"
