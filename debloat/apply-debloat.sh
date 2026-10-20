#!/usr/bin/env bash
# Apply debloat profile to Thomson Android TV
set -euo pipefail
cd "$(dirname "$0")"

TV_HOST="${TV_HOST:-192.168.1.8}"
echo "Connecting to TV at $TV_HOST:5555..."

if command -v adb >/dev/null 2>&1; then
    adb connect "$TV_HOST:5555" || true
    echo "Using ADB to safely disable telemetry and bloat packages..."
    while IFS= read -r line || [ -n "$line" ]; do
        pkg=$(echo "$line" | sed 's/#.*//' | tr -d '[:space:]')
        if [ -n "$pkg" ]; then
            echo "Disabling: $pkg"
            adb -s "$TV_HOST:5555" shell pm disable-user --user 0 "$pkg" || echo "  (skipped or restricted)"
        fi
    done < thomson-debloat.txt
    echo "Verifying disabled packages:"
    adb -s "$TV_HOST:5555" shell pm list packages -d
else
    echo "Using pure Python ADB client..."
    TV_HOST="$TV_HOST" venv/bin/python tv.py --batch < <(grep -vE '^\s*(#|$)' thomson-debloat.txt | awk '{print "pm disable-user --user 0 " $1}')
fi

echo "✅ Debloat completed successfully!"
