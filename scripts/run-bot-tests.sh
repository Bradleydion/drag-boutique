#!/bin/bash
# Runs the Maestro "bot" tests against the app in the iOS Simulator.
# Guest tests:      ./scripts/run-bot-tests.sh
# Plus signed-in:   ./scripts/run-bot-tests.sh you@example.com
#   (asks for the password; it is never saved anywhere)
cd "$(dirname "$0")/.." || exit 1
# Find the booted iOS Simulator (Xcode's Device Hub doesn't always announce it to Maestro).
UDID=$(xcrun simctl list devices booted | grep -Eo '[0-9A-F-]{36}' | head -1)
if [ -z "$UDID" ]; then
  echo "No booted Simulator found. Booted devices according to Xcode:"; xcrun simctl list devices booted
  echo "Open the Simulator (Sequins installed) and try again."; exit 1
fi
echo "Using Simulator $UDID"
DEVICE=(--device "$UDID")
if [ -n "$1" ]; then
  read -r -s -p "Password for $1: " PW; echo
  maestro "${DEVICE[@]}" test .maestro --format junit --output maestro-report.xml \
    --test-output-dir maestro-results \
    -e SEQUINS_EMAIL="$1" -e SEQUINS_PASSWORD="$PW"
else
  maestro "${DEVICE[@]}" test .maestro --exclude-tags signed-in --format junit --output maestro-report.xml \
    --test-output-dir maestro-results
fi
echo; echo "Screenshots + logs: $(pwd)/maestro-results"
