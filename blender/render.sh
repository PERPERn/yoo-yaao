#!/bin/bash
# Renders everything the home stage needs into blender/out (skips what exists), then encodes into app/public/media/stage.
cd "$(dirname "$0")"; mkdir -p out ../app/public/media/stage
B="/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P"
V="dtv ltr privilege visa-exempt retirement"; C="bangkok chiang-mai phuket"
for j in wall lit; do $B gallery.py -- "$PWD/out" $j 110; done
for s in $V; do $B gallery.py -- "$PWD/out" detail:$s 110; $B gallery.py -- "$PWD/out" tall:$s 90; done
for s in $V; do $B gallery.py -- "$PWD/out" dolly:$s 40; done
for j in map lit tall; do $B thaimap.py -- "$PWD/out" $j 96; done
for s in $C; do $B thaimap.py -- "$PWD/out" dolly:$s 24; done
bash encode.sh
