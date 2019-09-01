#!/usr/bin/env bash

set -e -o pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
cd ..

ROOT_DIR=$(pwd)
SCRIPTS_DIR="$ROOT_DIR/scripts"

