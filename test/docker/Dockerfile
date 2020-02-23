# keep this in sync with travis: https://docs.travis-ci.com/user/ci-environment
FROM ubuntu:eoan

WORKDIR /root

ENV DEBIAN_FRONTEND noninteractive

# install basic deps
RUN apt-get update && apt-get -y install --no-install-recommends \
  software-properties-common wget curl git xvfb sudo unzip python libxss1 net-tools libgtk-3-0 rsync xz-utils

# install Java
RUN add-apt-repository ppa:openjdk-r/ppa && \
    apt-get update && \
    apt install -y --no-install-recommends \
    openjdk-13-jdk ca-certificates-java && \
    java -version

# dependencies needed by chrome/chromedriver
RUN apt-get -y install libnss3 libgconf-2-4 libasound2 libgbm1

# install latest lein
ENV LEIN_ROOT 1
RUN cd /usr/bin && \
    wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein && \
    chmod a+x lein && \
    yes y | lein upgrade

VOLUME ["/root/binaryage/dirac"]
ENTRYPOINT ["/root/binaryage/dirac/scripts/docker-entrypoint.sh"]

RUN echo "\n==============\nBuild summary:" && \
    lsb_release -a && \
    echo && \
    java -version && \
    lein --version && \
    python --version && \
    echo "==============\n"