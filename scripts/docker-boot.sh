#!/bin/bash

set +e

# ensure host user matches our internal docker user
env | grep DIRAC

deluser docker
delgroup docker
EXISTING_USER="$(getent passwd "$DIRAC_HOST_UID")"
EXISTING_GROUP="$(getent group "$DIRAC_HOST_GID" | cut -d ":" -f 1)"
if [[ -n "$EXISTING_USER" ]]; then
  deluser "$EXISTING_USER"
fi
if [[ -n "$EXISTING_GROUP" ]]; then
  delgroup "$EXISTING_GROUP"
fi
groupadd --system --gid "$DIRAC_HOST_GID" docker
useradd --create-home --shell /bin/bash --uid "$DIRAC_HOST_UID" --gid "$DIRAC_HOST_GID" -G sudo docker

set -e

chown -R docker /dirac-ws
chown docker /dirac
chown -R docker /home/docker

export DIRAC_WORKSPACE_DIR="/dirac-ws"

exec sudo -u docker --preserve-env=DIRAC_WORKSPACE_DIR,DIRAC_DEBUG -- "$(dirname "${BASH_SOURCE[0]}")/docker-entrypoint.sh" "$@"
