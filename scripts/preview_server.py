#!/usr/bin/env python3
"""
Lightweight Range-capable HTTP preview & download server for the rendered short film.
Supports HTTP 206 Partial Content for smooth MP4 seeking and ?download=1 for direct download.
"""
import os
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8765

HTML_PAGE = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>عمرو بن الجموح — فيديو شورت</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f1738;
      color: #f6eedc;
      font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      gap: 18px;
    }
    .header { text-align: center; }
    .header h1 { font-size: 1.45rem; color: #f4d47c; margin-bottom: 6px; }
    .header p { font-size: 0.92rem; color: #b7c3e6; }
    .player-wrap {
      width: min(390px, 94vw);
      aspect-ratio: 9 / 16;
      background: #080d22;
      border: 3px solid #c99a3e;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.55);
    }
    video { width: 100%; height: 100%; display: block; background: #080d22; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    .btn {
      text-decoration: none;
      padding: 11px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.95rem;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.88; }
    .btn-gold { background: #d4a446; color: #1a1108; }
    .btn-sec { background: #1e328d; color: #f6eedc; border: 1px solid #4f74c8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>«أطأ بعرجتي هذه في الجنة» — عمرو بن الجموح</h1>
    <p>1080×1920 • 30fps • 81 ثانية • أسلوب التذهيب المخطوطي (Lemo-Opuscar × Remotion)</p>
  </div>
  <div class="player-wrap">
    <video controls playsinline preload="metadata" poster="/poster.jpg">
      <source src="/amr-ibn-al-jamuh.mp4" type="video/mp4" />
    </video>
  </div>
  <div class="actions">
    <a class="btn btn-gold" href="/amr-ibn-al-jamuh.mp4?download=1" download="amr-ibn-al-jamuh.mp4">تحميل الفيديو (MP4 — 44 MB)</a>
    <a class="btn btn-sec" href="/subtitles_ar.srt?download=1" download="subtitles_ar.srt">تحميل الترجمة (SRT)</a>
    <a class="btn btn-sec" href="/poster.jpg?download=1" download="poster.jpg">تحميل الغلاف (JPG)</a>
  </div>
</body>
</html>
"""

FILES = {
    "/amr-ibn-al-jamuh.mp4": ("amr-ibn-al-jamuh.mp4", "video/mp4"),
    "/poster.jpg": ("poster.jpg", "image/jpeg"),
    "/subtitles_ar.srt": ("subtitles_ar.srt", "text/plain; charset=utf-8"),
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)
        download = "download" in qs

        if path in ("/", "/index.html"):
            body = HTML_PAGE.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if path not in FILES:
            self.send_error(404)
            return

        fname, ctype = FILES[path]
        fpath = os.path.join(ROOT, fname)
        if not os.path.exists(fpath):
            self.send_error(404)
            return

        size = os.path.getsize(fpath)
        range_hdr = self.headers.get("Range")
        start, end = 0, size - 1
        status = 200

        if range_hdr:
            m = re.match(r"bytes=(\d+)-(\d*)", range_hdr)
            if m:
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else size - 1
                end = min(end, size - 1)
                status = 206

        length = end - start + 1
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        if download:
            self.send_header("Content-Disposition", f'attachment; filename="{fname}"')
        self.end_headers()

        with open(fpath, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(262144, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except BrokenPipeError:
                    break
                remaining -= len(chunk)


if __name__ == "__main__":
    srv = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Serving Amr ibn al-Jamuh Short preview on port {PORT}", flush=True)
    srv.serve_forever()
