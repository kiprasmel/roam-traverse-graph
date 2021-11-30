#!/usr/bin/env bash

set -e

git submodule update --init --recursive 

yarn install --frozen-lockfile

pushd ./roam-research-private-api

npm ci

# will also download chromium lmao, we really gotta get that edn format going from json...

popd
