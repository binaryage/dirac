#!/usr/bin/env bash

# ensure we start in scripts folder
cd "$(dirname "${BASH_SOURCE[0]}")";

SCRIPTS=`pwd`

"$SCRIPTS/auto-job.sh" 2>&1
