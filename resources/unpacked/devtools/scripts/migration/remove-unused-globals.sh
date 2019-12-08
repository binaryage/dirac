#!/usr/bin/env bash

set -e -o pipefail
scripts_migration_dir=$(dirname "${BASH_SOURCE[0]}")

directories=$(find "$scripts_migration_dir/../../front_end/" -type d -maxdepth 1 -mindepth 1 -exec basename {} \;)

cd "$scripts_migration_dir"

for file in $directories; do
  npm run remove-unused "$file"
done
