#!/usr/bin/env bash

set -e

# http://stackoverflow.com/a/22644006/84283
trap "exit" INT TERM
trap "kill 0" EXIT

cd "$(dirname "${BASH_SOURCE[0]}")"; cd ..

ROOT=`pwd`
NODE_TARGET_ROOT="$ROOT/resources/demo-node"

if [ -z "$1" ]; then
  echo "launching source-maps server..."
  scripts/run-demo-node-source-maps-server.sh &
fi

pushd "$NODE_TARGET_ROOT" > /dev/null

node --inspect .compiled/demo.js

popd
