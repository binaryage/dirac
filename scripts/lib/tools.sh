#!/usr/bin/env bash

false && source "../_config.sh" # never executes, this is here just for IntelliJ Bash support to understand our sourcing

redirect_to_test_stage_if_needed() {
  if [ ! -z "$DIRAC_TEST_IN_STAGE" ]; then
    local spawn_script_path=`portable_realpath "$SPAWN_COMMAND"`
    local script_path=`portable_realpath --relative-to="$ROOT" "$spawn_script_path"`
    "$SCRIPTS/sync-test-stage.sh"
    pushd "$DIRAC_TEST_STAGE_DIR"
    unset DIRAC_TEST_IN_STAGE
    "$script_path"
    result=$?
    popd
    exit ${result}
  fi
}
