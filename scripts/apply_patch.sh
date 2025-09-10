#!/usr/bin/env bash
set -e
BR="patch-$(date +%F-%H%M%S)"
git checkout -b "$BR"
git apply --whitespace=fix -
git add -A
git commit -m "apply patch from chat"
git push -u origin "$BR"
echo "Branch pushed: $BR"
