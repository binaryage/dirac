#!/bin/bash

# this is the entry-point of our docker container, see test/docker/Dockerfile

set -e -o pipefail

TRAVIS_BUILD_DIR=/dirac

color_enabled() {
    local -i colors
    colors=$(tput colors 2>/dev/null)
    # shellcheck disable=SC2181
    [[ $? -eq 0 ]] && [[ $colors -gt 2 ]]
}

BOLD_FORMAT="${BOLD_FORMAT-$(color_enabled && tput bold)}"
ERROR_FORMAT="${ERROR_FORMAT-$(color_enabled && tput setaf 1)}"
DEBUG_FORMAT="${DEBUG_FORMAT-$(color_enabled && tput setaf 0)}"
RESET_FORMAT="${RESET_FORMAT-$(color_enabled && tput sgr0)}"

# https://stackoverflow.com/a/16178979/84283
color()(
  set -o pipefail
  "$@" 2>&1>&3 | sed "s/^[^+].*/${ERROR_FORMAT}&${RESET_FORMAT}/; s/^[+].*/${DEBUG_FORMAT}&${RESET_FORMAT}/" >&2
) 3>&1

init_travis_env() {
  export TRAVIS=1

  echo "====================================================================================================================="
  pushd $TRAVIS_BUILD_DIR >/dev/null
  source "scripts/init-travis.sh"
  popd >/dev/null
  echo "====================================================================================================================="
}

print_env() {
  echo
  echo "--- EFFECTIVE ENVIRONMENT ---"
  env
  echo "-----------------------------"
}

echo_cmd() {
  echo "(in $(pwd)) $ $@"
  "$@"
}

do_prime() {
  pushd "$TRAVIS_BUILD_DIR" >/dev/null
  export SKIP_DIRAC_TESTS=1
  init_travis_env
  print_env
  popd >/dev/null
}

do_test() {
  pushd "$TRAVIS_BUILD_DIR" >/dev/null
  init_travis_env
  print_env
  echo_cmd ./scripts/test-all.sh "$@"
  result=$?
  popd >/dev/null
  return $result
}

do_test_browser() {
  pushd "$TRAVIS_BUILD_DIR" >/dev/null
  init_travis_env
  print_env
  echo_cmd ./scripts/test-browser.sh "$@"
  result=$?
  popd >/dev/null
  return $result
}

# ---------------------------------------------------------------------------------------------------------------------------

if [[ "$1" == "prime" ]]; then
  shift
  color do_prime "$@"
  exit 0
fi

if [[ "$1" == "test" ]]; then
  shift
  color do_test "$@"
  exit $?
fi

if [[ "$1" == "test-browser" ]]; then
  shift
  color do_test_browser "$@"
  exit $?
fi

if [[ $# -eq 0 ]]; then
  echo "no arguments provided"
  echo "please provide a command to run in dirac directory, e.g."
  echo "  launch './scripts/run-docker.sh test'"
  echo "  launch './scripts/run-docker.sh test-browser'"
  echo "  launch './scripts/run-docker.sh bash'"
  exit 1
else
  cd "$TRAVIS_BUILD_DIR"
  echo "(in $(pwd)) [exec raw command] $ $@"
  exec "$@"
fi
