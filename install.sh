#!/usr/bin/env bash

set -e

git submodule update --init --recursive 

yarn install --frozen-lockfile

# disabled because we don't use the private api anymore,
# since we don't export into a separte roam graph, - rather,
# we generate our static html 

#pushd ./roam-research-private-api
#npm ci
## will also download chromium lmao, we really gotta get that edn format going from json...
#popd
