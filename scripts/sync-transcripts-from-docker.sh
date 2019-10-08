#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$SCRIPTS"

./sync-transcripts.sh "$DIRAC_DOCKER_TEST_STAGE_DIR"
