#!/bin/sh

cat <(echo 'zap ZDF') - | nc fluxbox 5885 | pv > ZDF.ts
