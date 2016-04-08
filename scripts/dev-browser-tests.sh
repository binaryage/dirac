#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

## http://stackoverflow.com/a/26966800/84283
#kill_descendant_processes() {
#    local pid="$1"
#    local and_self="${2:-false}"
#    if children="$(pgrep -P "$pid")"; then
#        for child in $children; do
#            kill_descendant_processes "$child" true
#        done
#    fi
#    if [[ "$and_self" == true ]]; then
#        kill -9 "$pid"
#    fi
#}
#
## Ctrl-C trap. Catches INT signal
#trap "echo xxx!; kill_descendant_processes $$; exit 0" INT

lein clean

pushd "$SCRIPTS"

./clear-notify.sh

popd

lein dev-browser-tests