#!/usr/bin/env bash

# this script tries to launch dirac agent from command line
#
# usage ./agent-launcher.sh [args]
#
# it uses maven to download dirac library with all dependencies from clojars.org into local maven repo
# then it tries to launch it from command-line using current java environment

set -e

DIRAC_VERSION=LATEST # e.g. 0.1.0 or LATEST
DIRAC_GROUP=binaryage
DIRAC_ARTIFACT=dirac

NO_DEPENDENCY_GET=$NO_DEPENDENCY_GET

LOCAL_REPO=`mvn help:evaluate -Dexpression=settings.localRepository | grep -v '[INFO]'`

pushd () {
  command pushd "$@" > /dev/null
}

popd () {
  command popd "$@" > /dev/null
}

# dependency:get downloads library with all dependencies
if [ -z "$NO_DEPENDENCY_GET" ] ; then
  mvn -q dependency:get -DgroupId="$DIRAC_GROUP" -DartifactId="$DIRAC_ARTIFACT" -Dversion="$DIRAC_VERSION"
fi

RESOLVED_VERSION=`mvn help:evaluate -Dartifact=$DIRAC_GROUP:$DIRAC_ARTIFACT -Dexpression=project.version | grep -v '[INFO]'`
LOCAL_DIRAC_PATH="$LOCAL_REPO/$DIRAC_GROUP/$DIRAC_ARTIFACT/$RESOLVED_VERSION"
LOCAL_DIRAC_POM_PATH="$LOCAL_DIRAC_PATH/$DIRAC_ARTIFACT-$RESOLVED_VERSION.pom"
LOCAL_DIRAC_JAR_PATH="$LOCAL_DIRAC_PATH/$DIRAC_ARTIFACT-$RESOLVED_VERSION.jar"

if [ ! -r "$LOCAL_DIRAC_POM_PATH" ] ; then
  echo "unexpected error: clojars' pom file does not exist '$LOCAL_DIRAC_POM_PATH'"
  exit 10
fi

# http://stackoverflow.com/a/34676160/84283
WORK_DIR=`mktemp -q -d /tmp/dirac-agent-launcher-XXXXXXX`
if [ $? -ne 0 ]; then
  echo "$0: Can't create temp file, exiting..."
  exit 1
fi

function cleanup {
  if [[ "$WORK_DIR" == /tmp/dirac-agent-launcher* ]] ; then  # this is just a paranoid test if something went terribly wrong and mktemp returned "/" or something non-tmp-ish
    rm -rf "$WORK_DIR"
    # echo "Deleted temp working directory $WORK_DIR"
  else
    echo "Unexpected temporary directory. Delete it manually '$WORK_DIR'."
  fi
}
trap cleanup EXIT

# maven needs to have pom.xml for dependency:build-classpath to work, we have to read it from clojars
pushd "$WORK_DIR"
cp "$LOCAL_DIRAC_POM_PATH" pom.xml
CLASS_PATH=`mvn dependency:build-classpath | grep -v '[INFO]'`
popd

FULL_CLASS_PATH="$CLASS_PATH:$LOCAL_DIRAC_JAR_PATH"

# launch the agent with full classpath
java -classpath "$FULL_CLASS_PATH" clojure.main --main dirac.agent-cli "$@"