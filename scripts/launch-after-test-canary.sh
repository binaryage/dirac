#!/usr/bin/env bash

set -e

. "$(dirname "${BASH_SOURCE[0]}")/config.sh"

sleep 1

while [ ! -f "$TEST_CANARY_FLAG_FILE" ] ;
do
  sleep 1
done

echo "launching: $1"

$1