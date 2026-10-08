#!/bin/bash
# widen.sh <task> <extra-paths> <why>: under the gate lock, widen tasks/<task>.md on main in a session
S=${ORCH_DIR:-$HOME/tins-orch}
export LMS_ACCEPTANCE_DIR=${WORK:-$HOME}/tins-lms-tests/acceptance LMS_NODE_MODULES=${WORK:-$HOME}/tins-lms/node_modules
exec 9>$S/gate.lock; flock 9; cd ${WORK:-$HOME}/tins-lms
echo "$(date -u +%H:%M) start widen $1" >> $S/jobs.log
node .tins/kit/bin/kit.mjs start --paths tasks/$1.md --model orchestrator >/dev/null && sed -i "s#^paths: \(.*\)\$#paths: \1,$2#" tasks/$1.md && node .tins/kit/bin/kit.mjs close --note "widen task $1 scope" --why "$3" > $S/widen-$1.log 2>&1
r=$(tail -1 $S/widen-$1.log); echo "$(date -u +%H:%M) done widen $1: $r" >> $S/jobs.log; echo "$r"
