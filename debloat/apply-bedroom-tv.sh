#!/usr/bin/env bash
set -euo pipefail

TV_TARGET="${1:-192.168.0.11:5555}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIST_FILE="$SCRIPT_DIR/bedroom-tv-debloat.txt"

echo "=== Connecting to Bedroom TV ($TV_TARGET) ==="
adb connect "$TV_TARGET" || true

echo "=== Disabling Unneeded Packages via Python Bridge ==="
python3 - "$TV_TARGET" "$LIST_FILE" << 'PY_EOF'
import sys, subprocess

target = sys.argv[1]
list_file = sys.argv[2]

res = subprocess.run(['adb', '-s', target, 'shell', 'pm', 'list', 'packages'], capture_output=True, text=True)
installed = set(line.replace('package:', '').strip() for line in res.stdout.splitlines())

with open(list_file) as f:
    packages = [line.strip() for line in f if line.strip() and not line.startswith('#')]

disabled = 0
for pkg in packages:
    if pkg in installed:
        subprocess.run(['adb', '-s', target, 'shell', 'pm', 'disable-user', '--user', '0', pkg], capture_output=True)
        print(f"Disabled: {pkg}")
        disabled += 1

print(f"Total packages processed: {disabled}")
PY_EOF

echo "=== Applying UI Animation Tweaks (0.5x speedup) ==="
adb -s "$TV_TARGET" shell settings put global window_animation_scale 0.5
adb -s "$TV_TARGET" shell settings put global transition_animation_scale 0.5
adb -s "$TV_TARGET" shell settings put global animator_duration_scale 0.5

echo "=== Flushing Log Buffers ==="
adb -s "$TV_TARGET" shell logcat -b all -c || true

echo "=== Optimization Complete! ==="
