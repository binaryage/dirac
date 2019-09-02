#!/usr/bin/env bash

# shellcheck source=_shared.sh
source "$(dirname "${BASH_SOURCE[0]}")/_shared.sh"

exec clojure -A:repl -m dirac-figmain.repl