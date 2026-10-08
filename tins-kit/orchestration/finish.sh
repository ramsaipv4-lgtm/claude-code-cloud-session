#!/bin/bash
# finish.sh <task>: write transcript evidence into the worktree and run its gate
S=${ORCH_DIR:-$HOME/tins-orch}
id=$1
# every builder that worked on the task, in order: the original and any takeover ("<id>s")
T=$S/tr-$id.jsonl; : > $T
for aid in $(grep -E "^$id(s)? " $S/agents.txt | awk '{print $2}'); do cat /tmp/claude-0/-home-user-claude-code-cloud-session/663d54d2-7ebb-5062-84a0-11ced49da6a4/tasks/$aid.output >> $T; done
W=${WORK:-$HOME}/tins-lms.worktrees/$id
export LMS_ACCEPTANCE_DIR=${WORK:-$HOME}/tins-lms-tests/acceptance LMS_NODE_MODULES=${WORK:-$HOME}/tins-lms/node_modules
python3 $S/evidence.py $T > $S/ev-$id.md
n=$(grep -c '^### E' $S/ev-$id.md)
if [ "$n" -gt 0 ]; then (echo "# $id transcript evidence (extracted by the orchestrator)"; echo; cat $S/ev-$id.md) > $W/docs/build-journal/$id.evidence.md; fi
cd $W && echo "evidence items: $n; status:"; git status --short | head -5; git log --oneline -1; node .tins/kit/bin/kit.mjs gate 2>&1 | grep -E "gate:|FAIL|account" | head -8
