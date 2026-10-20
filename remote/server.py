#!/usr/bin/env python3
"""
Smart TV Suite — iPhone / iPad Touch Web Remote Server
Provides a high-performance web interface over local Wi-Fi to control your Android TV,
switch family profiles, track screen time, and upload photos as TV wallpapers.
"""

import http.server
import json
import os
import re
import socket
import subprocess
import sys
import urllib.parse
import uuid

PORT = int(os.environ.get("REMOTE_PORT", 8080))
TV_HOST = os.environ.get("TV_HOST", "192.168.1.8")
TV_PORT = os.environ.get("TV_PORT", "5555")
TV_ADDR = f"{TV_HOST}:{TV_PORT}"

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
TV_FILES_DIR = "/sdcard/Android/data/com.gathin.tvhome/files"

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def run_adb(args):
    cmd = ["adb", "-s", TV_ADDR] + args
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
        return res.returncode == 0, res.stdout.strip()
    except Exception as e:
        return False, str(e)

KEY_MAP = {
    "UP": "KEYCODE_DPAD_UP",
    "DOWN": "KEYCODE_DPAD_DOWN",
    "LEFT": "KEYCODE_DPAD_LEFT",
    "RIGHT": "KEYCODE_DPAD_RIGHT",
    "OK": "KEYCODE_DPAD_CENTER",
    "SELECT": "KEYCODE_DPAD_CENTER",
    "ENTER": "KEYCODE_ENTER",
    "HOME": "KEYCODE_HOME",
    "BACK": "KEYCODE_BACK",
    "MENU": "KEYCODE_MENU",
    "PLAY_PAUSE": "KEYCODE_MEDIA_PLAY_PAUSE",
    "VOL_UP": "KEYCODE_VOLUME_UP",
    "VOL_DOWN": "KEYCODE_VOLUME_DOWN",
    "MUTE": "KEYCODE_VOLUME_MUTE",
    "POWER": "KEYCODE_POWER",
    "INPUT": "KEYCODE_TV_INPUT",
    "SETTINGS": "KEYCODE_SETTINGS"
}

class RemoteRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/status":
            ok, out = run_adb(["shell", "dumpsys", "activity", "activities"])
            current_app = "Unknown"
            if ok:
                match = re.search(r"mResumedActivity: ActivityRecord\{[^\}]+ ([\w.]+)/", out)
                if match:
                    current_app = match.group(1)
            self.send_json({"connected": ok, "tv": TV_ADDR, "current_app": current_app})

        elif parsed.path == "/api/profiles":
            # Read profile_stats.json from TV
            ok, out = run_adb(["shell", "cat", f"{TV_FILES_DIR}/profile_stats.json"])
            if ok and out.startswith("{"):
                try:
                    stats = json.loads(out)
                    self.send_json(stats)
                    return
                except Exception:
                    pass
            # Default fallback if file is not yet created
            self.send_json({
                "active_profile": "Sujay",
                "profiles": [
                    {"name": "Sujay", "watch_time": "0m"},
                    {"name": "Devendra Babu", "watch_time": "0m"},
                    {"name": "Sirisha", "watch_time": "0m"}
                ]
            })

        elif parsed.path == "/api/screenshot":
            run_adb(["shell", "screencap", "-p", "/data/local/tmp/remote_shot.png"])
            local_tmp = "/tmp/remote_shot.png"
            run_adb(["pull", "/data/local/tmp/remote_shot.png", local_tmp])
            run_adb(["shell", "rm", "-f", "/data/local/tmp/remote_shot.png"])
            if os.path.exists(local_tmp):
                with open(local_tmp, "rb") as f:
                    data = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "image/png")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                self.wfile.write(data)
            else:
                self.send_json({"error": "Screenshot capture failed"}, status=500)
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_len = int(self.headers.get("Content-Length", 0))

        if parsed.path == "/api/wallpaper":
            # Receive raw image data
            image_bytes = self.rfile.read(content_len) if content_len > 0 else b""
            if not image_bytes:
                self.send_json({"error": "No image data received"}, status=400)
                return
            local_wp = "/tmp/uploaded_wallpaper.jpg"
            with open(local_wp, "wb") as f:
                f.write(image_bytes)

            # Push wallpaper to TV
            run_adb(["shell", "mkdir", "-p", TV_FILES_DIR])
            run_adb(["push", local_wp, f"{TV_FILES_DIR}/wallpaper.jpg"])

            # Create & push config.json with wallpaper: true and sky_intensity: 60
            cfg_path = "/tmp/theme_config.json"
            with open(cfg_path, "w") as f:
                json.dump({"wallpaper": True, "sky_intensity": 60}, f)
            run_adb(["push", cfg_path, f"{TV_FILES_DIR}/config.json"])

            # Set revision marker & restart launcher
            rev = uuid.uuid4().hex
            run_adb(["shell", f"printf '{rev}' > {TV_FILES_DIR}/theme_revision"])
            run_adb(["shell", "am", "force-stop", "com.gathin.tvhome"])
            run_adb(["shell", "am", "start", "-n", "com.gathin.tvhome/.MainActivity"])
            self.send_json({"success": True, "message": "Wallpaper updated on TV!"})
            return

        elif parsed.path == "/api/wallpaper/reset":
            run_adb(["shell", "rm", "-f", f"{TV_FILES_DIR}/wallpaper.jpg"])
            cfg_path = "/tmp/theme_config.json"
            with open(cfg_path, "w") as f:
                json.dump({"wallpaper": False, "sky_intensity": 60}, f)
            run_adb(["push", cfg_path, f"{TV_FILES_DIR}/config.json"])
            rev = uuid.uuid4().hex
            run_adb(["shell", f"printf '{rev}' > {TV_FILES_DIR}/theme_revision"])
            run_adb(["shell", "am", "force-stop", "com.gathin.tvhome"])
            run_adb(["shell", "am", "start", "-n", "com.gathin.tvhome/.MainActivity"])
            self.send_json({"success": True, "message": "Wallpaper reset to default"})
            return

        # Handle JSON body for other endpoints
        post_data = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            body = json.loads(post_data)
        except Exception:
            body = {}

        if parsed.path == "/api/key":
            key_name = body.get("key", "").upper()
            keycode = KEY_MAP.get(key_name, key_name if key_name.startswith("KEYCODE_") else None)
            if not keycode:
                self.send_json({"error": f"Invalid key: {key_name}"}, status=400)
                return
            ok, out = run_adb(["shell", "input", "keyevent", keycode])
            self.send_json({"success": ok, "key": key_name, "keycode": keycode})

        elif parsed.path == "/api/profile/set":
            profile_name = body.get("profile", "Sujay")
            ok, out = run_adb(["shell", "am", "start", "-n", "com.gathin.tvhome/.MainActivity", "--es", "profile", profile_name])
            self.send_json({"success": ok, "profile": profile_name})

        elif parsed.path == "/api/launch":
            pkg = body.get("package", "")
            if not pkg:
                self.send_json({"error": "Missing package name"}, status=400)
                return
            ok, out = run_adb(["shell", "monkey", "-p", pkg, "-c", "android.intent.category.LAUNCHER", "1"])
            self.send_json({"success": ok, "package": pkg})

        elif parsed.path == "/api/text":
            text = body.get("text", "")
            formatted_text = text.replace(" ", "%s")
            ok, out = run_adb(["shell", "input", "text", formatted_text])
            self.send_json({"success": ok, "text": text})

        else:
            self.send_json({"error": "Endpoint not found"}, status=404)

    def send_json(self, data, status=200):
        response = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(response)

def main():
    subprocess.run(["adb", "connect", TV_ADDR], capture_output=True)
    local_ip = get_local_ip()
    server_address = ("0.0.0.0", PORT)
    httpd = http.server.ThreadingHTTPServer(server_address, RemoteRequestHandler)
    print("\n=======================================================")
    print(" 📺 Smart TV Suite — iPhone / iPad Touch Remote Server")
    print("=======================================================")
    print(f" • Connected to TV:  {TV_ADDR}")
    print(f" • Mac Local URL:    http://localhost:{PORT}")
    print(f" • iPhone/iPad URL:  http://{local_ip}:{PORT}")
    print(" Open the iPhone/iPad URL in Safari and tap 'Add to Home Screen'")
    print("=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping remote server...")
        httpd.server_close()

if __name__ == "__main__":
    main()
