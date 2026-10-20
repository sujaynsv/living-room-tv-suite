#!/usr/bin/env bash
# Restore all disabled packages and revert to stock launcher
set -euo pipefail
cd "$(dirname "$0")"

TV_HOST="${TV_HOST:-192.168.1.8}"
echo "Connecting to TV at $TV_HOST:5555 to restore stock configuration..."

if command -v adb >/dev/null 2>&1; then
    adb connect "$TV_HOST:5555" || true
    echo "Re-enabling all packages in debloat profile..."
    while IFS= read -r line || [ -n "$line" ]; do
        pkg=$(echo "$line" | sed 's/#.*//' | tr -d '[:space:]')
        if [ -n "$pkg" ]; then
            echo "Enabling: $pkg"
            adb -s "$TV_HOST:5555" shell pm enable --user 0 "$pkg" || true
        fi
    done < thomson-debloat.txt

    echo "Re-enabling stock Google TV launcher..."
    adb -s "$TV_HOST:5555" shell pm enable --user 0 com.google.android.tvlauncher || true
    adb -s "$TV_HOST:5555" shell cmd package set-home-activity --user 0 com.google.android.tvlauncher/.MainActivity || true
    echo "Current Home is now:"
    adb -s "$TV_HOST:5555" shell 'cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME'
else
    echo "Using pure Python ADB client..."
    TV_HOST="$TV_HOST" venv/bin/python tv.py --batch < <(grep -vE '^\s*(#|$)' thomson-debloat.txt | awk '{print "pm enable --user 0 " $1}')
    TV_HOST="$TV_HOST" venv/bin/python tv.py "pm enable --user 0 com.google.android.tvlauncher; cmd package set-home-activity --user 0 com.google.android.tvlauncher/.MainActivity"
fi

echo "✅ TV restored to factory stock launcher and apps!"
