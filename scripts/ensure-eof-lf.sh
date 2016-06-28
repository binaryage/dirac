#!/usr/bin/env bash

# http://unix.stackexchange.com/a/161853
for f in $(find . -type fls); do tail -n1 $f | read -r _ || echo >> $f; done
