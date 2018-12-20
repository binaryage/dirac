#!/usr/bin/env bash

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$DEVTOOLS_ROOT"

if [[ -f "$DEVTOOLS_NAMESPACES_EXTERNS_FILE" ]]; then
  rm "$DEVTOOLS_NAMESPACES_EXTERNS_FILE"
fi

python scripts/generate_namespaces_externs.py "$DEVTOOLS_NAMESPACES_EXTERNS_FILE"

if [[ -f "$DEVTOOLS_NAMESPACES_EXTERNS_FILE" ]]; then
  echo "Generated fresh $DEVTOOLS_NAMESPACES_EXTERNS_FILE"
else
  exit 1
fi

popd
