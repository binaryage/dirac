#!/bin/bash

java_bin_path=
if [ "$JAVA_HOME" != "" ]; then
  java_bin_path=$JAVA_HOME/bin/
fi

main_class=org.chromium.devtools.jsdoc.JsDocValidator
manifest_name=Manifest.txt
jar_name=jsdoc-validator.jar
script_path=$( cd $(dirname $0) ; pwd -P )
bin_path=$(mktemp -d)

function main() {
  shopt -s globstar
  echo "Compiling..."
  ${java_bin_path}javac -d $bin_path $script_path/src/**/*.java -cp $script_path/../closure/compiler.jar > /dev/null
  if [ $? != 0 ]; then
    bail 1
  fi

  echo "Building jar..."
  ${java_bin_path}jar cvfem $script_path/$jar_name $main_class $script_path/$manifest_name -C $bin_path . > /dev/null
  if [ $? != 0 ]; then
    bail 1
  fi
  bail 0
}

function bail() {
    rm -rf $bin_path
    if [ "$1" == "0" ]; then
      echo "Done."
    else
      echo "Failed."
    fi

    exit $1
}

main

