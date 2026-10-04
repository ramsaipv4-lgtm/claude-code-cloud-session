#!/bin/sh
# Q6 experiment. The incumbent `ack` asks three questions "answered from repo state" to prove the agent
# read the state. Exact questions are not available to us (ASSUMED shape: HEAD, highest decision id,
# gate result). This script answers that shape mechanically, reading nothing an agent would need to
# understand. If a 3-line script can pass ack, ack proves "a command ran", not "the state was understood".
echo "head: $(git rev-parse --short HEAD)"
echo "last decision: $(grep -oE '^\| D-[0-9]+' SPEC.md | tr -d '| ' | sort -t- -k2 -n | tail -1)"
echo "gate: $(node .tins/kit/bin/kit.mjs gate >/dev/null 2>&1 && echo pass || echo fail)"
