#!/usr/bin/env python3
"""
Smart TV Suite — iPhone / iPad Touch Web Remote Server
Provides a high-performance web interface over local Wi-Fi to control your Android TVs,
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
import urllib.request
import time
import uuid

PORT = int(os.environ.get("REMOTE_PORT", 8080))

DEVICES = {
    "living_room": {
        "id": "living_room",
        "name": "Living Room TV",
        "addr": os.environ.get("LIVING_ROOM_ADDR", "192.168.1.8:5555")
    },
    "bedroom": {
        "id": "bedroom",
        "name": "Bedroom TV",
        "addr": os.environ.get("BEDROOM_ADDR", "192.168.0.11:5555")
    }
}
ACTIVE_DEVICE_ID = os.environ.get("DEFAULT_TV", "living_room")

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
TV_FILES_DIR = "/sdcard/Android/data/com.gathin.tvhome/files"

def get_current_tv_addr():
    return DEVICES.get(ACTIVE_DEVICE_ID, {}).get("addr", "192.168.1.8:5555")

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
    target = get_current_tv_addr()
    cmd = ["adb", "-s", target] + args
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
        if parsed.path == "/api/devices":
            self.send_json({
                "devices": list(DEVICES.values()),
                "active_device": ACTIVE_DEVICE_ID,
                "active_addr": get_current_tv_addr()
            })
            return

        elif parsed.path == "/api/status":
            ok, out = run_adb(["shell", "dumpsys", "activity", "activities"])
            current_app = "Clean TV Home"
            if ok:
                match = re.search(r"mResumedActivity: ActivityRecord\{[^\}]+\s([\w.]+)/", out)
                if match:
                    current_app = match.group(1)
            self.send_json({
                "connected": ok,
                "tv": get_current_tv_addr(),
                "active_device": ACTIVE_DEVICE_ID,
                "device_name": DEVICES.get(ACTIVE_DEVICE_ID, {}).get("name", "TV"),
                "current_app": current_app
            })
            return

        elif parsed.path == "/api/profiles":
            ok, out = run_adb(["shell", "cat", f"{TV_FILES_DIR}/profile_stats.json"])
            if ok and out.startswith("{"):
                try:
                    stats = json.loads(out)
                    self.send_json(stats)
                    return
                except Exception:
                    pass
            self.send_json({
                "active_profile": "Sujay",
                "profiles": [
                    {"name": "Sujay", "watch_time": "0m"},
                    {"name": "Devendra Babu", "watch_time": "0m"},
                    {"name": "Sirisha", "watch_time": "0m"}
                ]
            })
            return

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
            return

        else:
            super().do_GET()

    def do_POST(self):
        global ACTIVE_DEVICE_ID
        parsed = urllib.parse.urlparse(self.path)
        content_len = int(self.headers.get("Content-Length", 0))

        if parsed.path == "/api/wallpaper":
            image_bytes = self.rfile.read(content_len) if content_len > 0 else b""
            if not image_bytes:
                self.send_json({"error": "No image data received"}, status=400)
                return
            local_wp = "/tmp/uploaded_wallpaper.jpg"
            with open(local_wp, "wb") as f:
                f.write(image_bytes)

            run_adb(["shell", "mkdir", "-p", TV_FILES_DIR])
            run_adb(["push", local_wp, f"{TV_FILES_DIR}/wallpaper.jpg"])

            cfg_path = "/tmp/theme_config.json"
            with open(cfg_path, "w") as f:
                json.dump({"wallpaper": True, "sky_intensity": 60}, f)
            run_adb(["push", cfg_path, f"{TV_FILES_DIR}/config.json"])

            rev = uuid.uuid4().hex
            run_adb(["shell", f"printf '{rev}' > {TV_FILES_DIR}/theme_revision"])
            run_adb(["shell", "am", "force-stop", "com.gathin.tvhome"])
            run_adb(["shell", "am", "start", "-n", "com.gathin.tvhome/.MainActivity"])
            self.send_json({"success": True, "message": f"Wallpaper updated on {DEVICES.get(ACTIVE_DEVICE_ID, {}).get('name')}!"})
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

        elif parsed.path == "/api/wallpapers/upload":
            image_bytes = self.rfile.read(content_len) if content_len > 0 else b""
            if not image_bytes:
                self.send_json({"error": "No image data"}, status=400)
                return
            wp_id = uuid.uuid4().hex[:8]
            local_tmp = f"/tmp/wp_{wp_id}.jpg"
            with open(local_tmp, "wb") as f:
                f.write(image_bytes)
            run_adb(["shell", "mkdir", "-p", f"{TV_FILES_DIR}/wallpapers"])
            run_adb(["push", local_tmp, f"{TV_FILES_DIR}/wallpapers/wp_{wp_id}.jpg"])
            run_adb(["push", local_tmp, f"{TV_FILES_DIR}/wallpaper.jpg"])
            cfg_path = "/tmp/theme_config.json"
            with open(cfg_path, "w") as f:
                json.dump({"wallpaper": True, "sky_intensity": 60}, f)
            run_adb(["push", cfg_path, f"{TV_FILES_DIR}/config.json"])
            rev = uuid.uuid4().hex
            run_adb(["shell", f"printf '{rev}' > {TV_FILES_DIR}/theme_revision"])
            self.send_json({"success": True, "message": "Added to TV slideshow gallery!", "wp_id": wp_id})
            return

        # Handle JSON body
        post_data = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            body = json.loads(post_data)
        except Exception:
            body = {}

        if parsed.path == "/api/devices/select":
            dev_id = body.get("device_id")
            if dev_id in DEVICES:
                ACTIVE_DEVICE_ID = dev_id
                subprocess.run(["adb", "connect", DEVICES[dev_id]["addr"]], capture_output=True)
                self.send_json({"success": True, "active_device": ACTIVE_DEVICE_ID, "device": DEVICES[dev_id]})
            else:
                self.send_json({"error": f"Unknown device id: {dev_id}"}, status=400)
            return

        elif parsed.path == "/api/key":
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

        elif parsed.path == "/api/ai/ask":
            query = body.get("query", "").strip()
            profile = body.get("profile", "Sujay")
            api_key = os.environ.get("GEMINI_API_KEY", "")
            
            reply = ""
            search_query = query
            intent_url = f"vnd.youtube://results?q={urllib.parse.quote(query)}"
            
            if api_key:
                try:
                    req_data = json.dumps({
                        "contents": [{
                            "parts": [{"text": f"You are a smart TV assistant for {profile}. The user asked: '{query}'. Provide a 1-sentence friendly suggestion and a 3-5 word exact search term for YouTube or OTT. Format: Suggestion | Search Term"}]
                        }]
                    }).encode("utf-8")
                    req = urllib.request.Request(
                        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                        data=req_data,
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        res_json = json.loads(resp.read().decode("utf-8"))
                        text_resp = res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
                        if "|" in text_resp:
                            reply, search_query = [s.strip() for s in text_resp.split("|", 1)]
                        else:
                            reply = text_resp
                            search_query = query
                        intent_url = f"vnd.youtube://results?q={urllib.parse.quote(search_query)}"
                except Exception as e:
                    reply = f"Here are the best matches for '{query}'"
            else:
                q_lower = query.lower()
                if "comedy" in q_lower or "funny" in q_lower:
                    reply = f"Here are top rated comedy specials & scenes for {profile}:"
                    search_query = f"{profile} favorite family comedy scenes" if "family" in q_lower else f"{query} popular"
                elif "music" in q_lower or "song" in q_lower:
                    reply = f"Playing relaxing music selection for {profile}:"
                    search_query = f"relaxing soothing music {query}"
                elif "news" in q_lower:
                    reply = "Tuning into live news updates:"
                    search_query = "live news stream english telugu"
                else:
                    reply = f"Found recommendations for '{query}':"
                    search_query = query
                intent_url = f"vnd.youtube://results?q={urllib.parse.quote(search_query)}"

            self.send_json({
                "success": True,
                "reply": reply,
                "search_query": search_query,
                "intent_url": intent_url,
                "profile": profile
            })

        elif parsed.path == "/api/beam":
            intent_url = body.get("intent_url", "")
            if not intent_url:
                self.send_json({"error": "Missing intent_url"}, status=400)
                return
            ok, out = run_adb(["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", intent_url])
            self.send_json({"success": ok, "intent_url": intent_url})

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
    for dev in DEVICES.values():
        subprocess.run(["adb", "connect", dev["addr"]], capture_output=True)
    local_ip = get_local_ip()
    server_address = ("0.0.0.0", PORT)
    httpd = http.server.ThreadingHTTPServer(server_address, RemoteRequestHandler)
    print("\n=======================================================")
    print(" 📺 Smart TV Suite — iPhone / iPad Touch Remote Server")
    print("=======================================================")
    for dev in DEVICES.values():
        print(f" • TV Device:       {dev['name']} ({dev['addr']})")
    print(f" • Mac Local URL:   http://localhost:{PORT}")
    print(f" • iPhone/iPad URL: http://{local_ip}:{PORT}")
    print(" Open the iPhone/iPad URL in Safari and tap 'Add to Home Screen'")
    print("=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping remote server...")
        httpd.server_close()

if __name__ == "__main__":
    main()
