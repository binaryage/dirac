#!/usr/bin/env bash

set -e

# set working directory as project's root now
cd "$(dirname "${BASH_SOURCE[0]}")"; cd ..

./scripts/reveal.cljs $@
