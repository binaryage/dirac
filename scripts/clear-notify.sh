#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

if [ -d "$NOTIFY_DIR" ] ; then
  rm -rf "$NOTIFY_DIR"
fi
