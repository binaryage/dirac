#!/usr/bin/env bash

# check our devtools code for google closure annotations and Chromium coding conventions

pushd `dirname "${BASH_SOURCE[0]}"` > /dev/null
source "./config.sh"

pushd "$DEVTOOLS_ROOT"

# http://stackoverflow.com/questions/107705/disable-output-buffering
python -u scripts/compile_frontend.py

popd

popd
