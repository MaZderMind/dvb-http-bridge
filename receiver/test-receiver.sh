#!/bin/bash
cat <(echo 'zap ZDF') - | nc fluxbox 5885 | mplayer -cache 1024 -
