# keep this in sync with travis: https://docs.travis-ci.com/user/ci-environment
FROM ubuntu:xenial

WORKDIR /root

ENV DEBIAN_FRONTEND noninteractive

# install basic deps
RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get -y install software-properties-common wget curl git xvfb sudo unzip python libxss1 net-tools libgtk-3-0

# install Java 11
RUN add-apt-repository ppa:openjdk-r/ppa
RUN apt-get update
RUN apt install -y openjdk-11-jdk ca-certificates-java
RUN java -version

# dependencies needed by chromedriver
RUN apt-get -y install libnss3 libgconf-2-4 libasound2

# install latest lein
ENV LEIN_ROOT 1
RUN cd /usr/bin \
    && wget https://raw.githubusercontent.com/technomancy/leiningen/stable/bin/lein \
    && chmod a+x lein \
    && lein
RUN yes y | lein upgrade

VOLUME ["/root/binaryage/dirac"]
ENTRYPOINT ["/root/binaryage/dirac/scripts/docker-entrypoint.sh"]
