#!/bin/bash
# Kills any single process above 4 GB RSS (test runaways); logs what it killed.
L=${ORCH_DIR:-$HOME/tins-orch}/memguard.log
while true; do
  ps -eo pid,rss,etime,cmd --no-headers | awk '$2 > 4000000 {print}' | while read -r pid rss et cmd; do
    case "$cmd" in *claude*|*environment-manager*) continue;; esac
    echo "$(date -u +%H:%M:%S) kill $pid rss=${rss}KB etime=$et cmd=${cmd:0:160}" >> $L; kill -9 "$pid"
  done
  sleep 5
done
