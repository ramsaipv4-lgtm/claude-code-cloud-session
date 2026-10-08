#!/bin/bash
# job.sh close <task> <why> | merge <task> : runs under one global lock so only one gate runs at a time
S=${ORCH_DIR:-$HOME/tins-orch}
export LMS_ACCEPTANCE_DIR=${WORK:-$HOME}/tins-lms-tests/acceptance LMS_NODE_MODULES=${WORK:-$HOME}/tins-lms/node_modules
op=$1; t=$2; why=$3
exec 9>$S/gate.lock; flock 9
echo "$(date -u +%H:%M) start $op $t" >> $S/jobs.log
if [ "$op" = close ]; then
  (cd ${WORK:-$HOME}/tins-lms.worktrees/$t && node .tins/kit/bin/kit.mjs close --why "$why") > $S/close-$t.log 2>&1
  r=$(tail -1 $S/close-$t.log)
else
  (cd ${WORK:-$HOME}/tins-lms && node .tins/kit/bin/kit.mjs merge $t) > $S/merge-$t.log 2>&1
  r=$(tail -1 $S/merge-$t.log)
  grep -q MERGED $S/merge-$t.log && (cd ${WORK:-$HOME}/tins-lms && git push -q origin main) && r="$r; pushed"
fi
echo "$(date -u +%H:%M) done $op $t: $r" >> $S/jobs.log
echo "$op $t: $r"
case "$r" in *"closed session"*|*MERGED*) exit 0;; *) exit 1;; esac
