#!/usr/bin/env bash

set -e -o pipefail
# shellcheck source=_config.sh
source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"

cd "$DEVTOOLS_ROOT"

if [[ -f "$DEVTOOLS_NAMESPACES_EXTERNS_FILE" ]]; then
  rm "$DEVTOOLS_NAMESPACES_EXTERNS_FILE"
fi

python scripts/generate_namespaces_externs.py "$DEVTOOLS_NAMESPACES_EXTERNS_FILE"

if [[ -f "$DEVTOOLS_NAMESPACES_EXTERNS_FILE" ]]; then
  echo "Generated fresh $DEVTOOLS_NAMESPACES_EXTERNS_FILE"
else
  exit 1
fi
