#!/bin/bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

"$SCRIPTS/sync-test-stage.sh" "$DIRAC_DOCKER_TEST_STAGE_DIR"

cd "$DOCKER_TESTS_DIR"

docker volume create --name "dirac-data-home" >/dev/null
docker volume create --name "dirac-data-ws" >/dev/null
docker volume create --name "dirac-data-var-cache-apt" >/dev/null

DIRAC_HOST_UID=${DIRAC_HOST_UID:-$(id -u)}
DIRAC_HOST_GID=${DIRAC_HOST_GID:-$(id -g)}

# for dns see https://forums.docker.com/t/intermittent-dns-resolving-issues/9584/17?u=drwin
docker run \
  --name "dirac-job" \
  -e DIRAC_HOST_UID="$DIRAC_HOST_UID" \
  -e DIRAC_HOST_GID="$DIRAC_HOST_GID" \
  -e DIRAC_DEBUG="$DIRAC_DEBUG" \
  --dns=8.8.8.8 \
  -v "dirac-data-home:/home/docker" \
  -v "dirac-data-ws:/dirac-ws" \
  -v "dirac-data-var-cache-apt:/var/cache/apt" \
  -v "$DIRAC_DOCKER_TEST_STAGE_DIR:/dirac" \
  --rm \
  -it dirac \
  "$@"
