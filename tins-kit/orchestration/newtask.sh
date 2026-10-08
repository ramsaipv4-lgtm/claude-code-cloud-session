#!/bin/bash
# usage: newtask.sh <id> <step> <msg>   (paths read from TASKS.md row)
set -e
cd ${WORK:-$HOME}/tins-lms
id=$1; step=$2; msg=$3
row=$(grep "^| $id |" TASKS.md)
code=$(echo "$row" | awk -F'|' '{print $7}' | sed 's/ //g')
paths="$code,build/progress/$id.json,docs/build-journal/$id.md,docs/build-journal/$id.evidence.md,course/steps/$step"
node .tins/kit/bin/kit.mjs task new $id --paths "$paths" -m "$msg" >/dev/null
W=${WORK:-$HOME}/tins-lms.worktrees/$id
ln -s ${WORK:-$HOME}/tins-lms/node_modules $W/node_modules
ln -s ${WORK:-$HOME}/tins-lms-tests/acceptance $W/acceptance
echo "$paths"
