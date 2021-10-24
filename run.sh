#!/usr/bin/env bash

bash -c 'LIMIT=38000000; ulimit -s $LIMIT; node --trace-uncaught --use-osr --trace-osr --stack-size=$LIMIT ./find-public-pages.js ../notes/json/kipras-g1.json "#public"'

