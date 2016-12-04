#!/usr/bin/env bash

# check our devtools code for google closure annotations and Chromium coding conventions

source "$(dirname "${BASH_SOURCE[0]}")/_config.sh"
false && source _config.sh # never executes, this is here just for IntelliJ Bash support to understand our sourcing

pushd "$DEVTOOLS_ROOT"

# http://stackoverflow.com/questions/107705/disable-output-buffering
python -u scripts/compile_frontend.py

popd
