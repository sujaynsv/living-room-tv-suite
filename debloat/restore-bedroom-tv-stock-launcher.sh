#!/usr/bin/env bash
# Restore Stock Google TV Launcher & Recommendations on Bedroom TV Stick
TARGET="${1:-192.168.0.11:5555}"
echo "Restoring stock Google TV Launcher on $TARGET..."

adb -s "$TARGET" shell pm enable com.google.android.tvlauncher
adb -s "$TARGET" shell pm enable com.google.android.tvrecommendations
adb -s "$TARGET" shell cmd package set-home-activity com.google.android.tvlauncher/.MainActivity
adb -s "$TARGET" shell input keyevent 3

echo "Stock Google TV Launcher restored successfully!"
