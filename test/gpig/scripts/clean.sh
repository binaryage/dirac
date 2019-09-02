#!/usr/bin/env bash

# shellcheck source=_shared.sh
source "$(dirname "${BASH_SOURCE[0]}")/_shared.sh"

rm -rf .cpcache
rm -rf target/