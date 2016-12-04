#!/usr/bin/env bash

pushd () {
    command pushd "$@" > /dev/null
}

popd () {
    command popd "$@" > /dev/null
}

# http://stackoverflow.com/a/4025065/84283
vercomp () {
    if [[ $1 == $2 ]]
    then
        return 0
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    # fill empty fields in ver1 with zeros
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++))
    do
        ver1[i]=0
    done
    for ((i=0; i<${#ver1[@]}; i++))
    do
        if [[ -z ${ver2[i]} ]]
        then
            # fill empty fields in ver2 with zeros
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]}))
        then
            return 1
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]}))
        then
            return 2
        fi
    done
    return 0
}

print_env() {
  echo
  echo "--- EFFECTIVE ENVIRONMENT ---"
  env
  echo "-----------------------------"
}

portable_realpath() {
  case "$OSTYPE" in
    darwin*)
      if [ -z "$(which grealpath)" ]; then
        echo "grealpath needed under OSX, please \`brew install coreutils\`"
        exit 1
      fi
      grealpath "$@" ;;
    *)
      realpath "$@" ;;
  esac
}
