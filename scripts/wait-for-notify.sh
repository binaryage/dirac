#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

TRIGGER_FILE="$NOTIFY_DIR/$1"

counter=0
while [[ ! -f "$TRIGGER_FILE" ]];
do
  counter=$((counter+1))
  n=$((counter%60))
  if [[ ${n} -eq 0 ]]; then
    echo "still waiting for '$TRIGGER_FILE' to be created..."
  fi
  sleep 1
done

echo "$TRIGGER_FILE found"
