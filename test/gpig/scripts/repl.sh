#!/usr/bin/env bash

# shellcheck source=_shared.sh
source "$(dirname "${BASH_SOURCE[0]}")/_shared.sh"

export DIRAC_NREPL__LOG_LEVEL=TRACE

exec clojure -m dirac-gpig.repl