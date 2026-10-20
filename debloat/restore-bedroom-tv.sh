#!/usr/bin/env bash
set -euo pipefail

TV_TARGET="192.168.0.11:5555"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIST_FILE="$SCRIPT_DIR/bedroom-tv-debloat.txt"

echo "=== Connecting to Bedroom TV ($TV_TARGET) ==="
adb connect "$TV_TARGET" || true

echo "=== Restoring / Re-enabling Packages ==="
while IFS= read -r line || [ -n "$line" ]; do
    pkg="$(echo "$line" | sed -e 's/#.*//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [ -z "$pkg" ] && continue

    echo "Re-enabling: $pkg"
    adb -s "$TV_TARGET" shell pm enable "$pkg" || true
done < "$LIST_FILE"

echo "=== Restoring Stock Animation Scales (1.0x) ==="
adb -s "$TV_TARGET" shell settings put global window_animation_scale 1.0
adb -s "$TV_TARGET" shell settings put global transition_animation_scale 1.0
adb -s "$TV_TARGET" shell settings put global animator_duration_scale 1.0

echo "=== Restore Complete ==="
