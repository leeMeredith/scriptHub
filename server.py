# server.py
from http.server import SimpleHTTPRequestHandler, HTTPServer
import json
import os
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECTS_DIR = os.path.join(ROOT, "projects")

os.makedirs(PROJECTS_DIR, exist_ok=True)

class ScriptHubHandler(SimpleHTTPRequestHandler):

    def do_GET(self):
        parsed = urlparse(self.path)

        # List projects
        if parsed.path == "/projects":
            files = [f for f in os.listdir(PROJECTS_DIR) if f.endswith(".fountain")]
            self._json_response(files)
            return

        # Open project
        if parsed.path == "/open":
            qs = parse_qs(parsed.query)
            filename = qs.get("file", [None])[0]

            if not filename:
                self._error("Missing filename")
                return

            path = os.path.join(PROJECTS_DIR, filename)
            if not os.path.exists(path):
                self._error("File not found")
                return

            with open(path, "r", encoding="utf-8") as f:
                text = f.read()

            self._json_response({"filename": filename, "text": text})
            return

        super().do_GET()

    def do_POST(self):
        if self.path != "/save":
            self._error("Unknown endpoint")
            return

        length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(length))

        filename = os.path.basename(data.get("filename"))
        text = data.get("text", "")

        if not filename:
            self._error("Missing filename")
            return

        path = os.path.join(PROJECTS_DIR, filename)

        with open(path, "w", encoding="utf-8") as f:
            f.write(text)

        self._json_response({"saved": True, "file": filename})

    def _json_response(self, payload):
        out = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def _error(self, msg):
        self.send_response(400)
        self.end_headers()
        self.wfile.write(msg.encode("utf-8"))

if __name__ == "__main__":
    os.chdir(ROOT)
    server = HTTPServer(("localhost", 8000), ScriptHubHandler)
    print("ScriptHub running at http://localhost:8000/")
    server.serve_forever()
