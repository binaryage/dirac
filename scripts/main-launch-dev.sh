#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$ROOT"

JVM_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=127.0.0.1:5005"
export JVM_OPTS

./scripts/main.sh -vv launch --releases "$ROOT/../releases-dev.edn" --debug 9222 "$@"
