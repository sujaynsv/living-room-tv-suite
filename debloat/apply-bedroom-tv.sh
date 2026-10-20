#!/usr/bin/env bash
set -euo pipefail

TV_TARGET="192.168.0.11:5555"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIST_FILE="$SCRIPT_DIR/bedroom-tv-debloat.txt"

echo "=== Connecting to Bedroom TV ($TV_TARGET) ==="
adb connect "$TV_TARGET" || true

echo "=== Disabling Unneeded Packages & Telemetry ==="
DISABLED=0
while IFS= read -r line || [ -n "$line" ]; do
    pkg="$(echo "$line" | sed -e 's/#.*//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [ -z "$pkg" ] && continue

    if adb -s "$TV_TARGET" shell pm list packages | grep -q "^package:$pkg$"; then
        echo "Disabling: $pkg"
        adb -s "$TV_TARGET" shell pm disable-user --user 0 "$pkg" || true
        DISABLED=$((DISABLED + 1))
    fi
done < "$LIST_FILE"

echo "=== Applying UI Animation Tweaks (0.5x speedup) ==="
adb -s "$TV_TARGET" shell settings put global window_animation_scale 0.5
adb -s "$TV_TARGET" shell settings put global transition_animation_scale 0.5
adb -s "$TV_TARGET" shell settings put global animator_duration_scale 0.5

echo "=== Flushing Log Buffers ==="
adb -s "$TV_TARGET" shell logcat -b all -c || true

echo "=== Done! Disabled $DISABLED bloatware packages on Bedroom TV ==="
