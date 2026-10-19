#!/bin/bash
# Runs the Maestro "bot" tests against the app in the iOS Simulator.
# Guest tests:      ./scripts/run-bot-tests.sh
# Plus signed-in:   ./scripts/run-bot-tests.sh you@example.com
#   (asks for the password; it is never saved anywhere)
cd "$(dirname "$0")/.." || exit 1
if [ -n "$1" ]; then
  read -r -s -p "Password for $1: " PW; echo
  maestro test .maestro --format junit --output maestro-report.xml \
    --test-output-dir maestro-results \
    -e SEQUINS_EMAIL="$1" -e SEQUINS_PASSWORD="$PW"
else
  maestro test .maestro --exclude-tags signed-in --format junit --output maestro-report.xml \
    --test-output-dir maestro-results
fi
echo; echo "Screenshots + logs: $(pwd)/maestro-results"
