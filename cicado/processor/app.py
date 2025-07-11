from flask import Flask, request, jsonify
import tempfile
import os
import subprocess
import base64
from PIL import Image
import io
from supabase import create_client, Client

app = Flask(__name__)

SUPABASE_URL = 'https://whgjhwtcxkxhzkxrndlz.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ2pod3RjeGt4aHpreHJuZGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNTMxNTksImV4cCI6MjA2NzgyOTE1OX0.6iMNENGsz08DGs2MNrbubjyTalrDM8jgiBPeJ7VVYd4')
BUCKET = 'files'
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def run_command(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
        return result.stdout + result.stderr
    except Exception as e:
        return str(e)

def analyze_stegsolve(image_path):
    results = []
    try:
        modes = [
            "Red plane 0",
            "Green plane 0",
            "Blue plane 0",
            "Alpha plane 0",
            "LSB of Red plane",
            "LSB of Green plane",
            "LSB of Blue plane",
            "LSB of Alpha plane"
        ]
        for mode in modes:
            cmd = f"java -jar /usr/local/bin/stegsolve.jar -s {mode} -o /tmp/stegsolve_out.png {image_path}"
            subprocess.run(cmd, shell=True, capture_output=True)
            if os.path.exists("/tmp/stegsolve_out.png"):
                with open("/tmp/stegsolve_out.png", "rb") as f:
                    img_data = f.read()
                    results.append({
                        "mode": mode,
                        "image": base64.b64encode(img_data).decode('utf-8')
                    })
                os.remove("/tmp/stegsolve_out.png")
    except Exception as e:
        results.append({"error": str(e)})
    return results

@app.route('/process', methods=['POST'])
def process():
    data = request.json
    file_key = data.get('key')
    password = data.get('password', '')
    print(f"Received file_key: {file_key}")
    if not file_key:
        return jsonify({'error': 'Missing file key'}), 400
    with tempfile.TemporaryDirectory() as tmpdir:
        local_path = os.path.join(tmpdir, os.path.basename(file_key))
        # Download file from Supabase Storage
        try:
            response = supabase.storage.from_(BUCKET).download(file_key)
            with open(local_path, 'wb') as f:
                f.write(response)
        except Exception as e:
            return jsonify({'error': f'Failed to download {file_key} from Supabase: {str(e)}'}), 500
        tools = {
            "cat": f"cat '{local_path}'",
            "strings": f"strings '{local_path}'",
            "binwalk": f"binwalk '{local_path}'",
            "foremost": f"foremost -T -i '{local_path}' -o '{tmpdir}/foremost_out' && find '{tmpdir}/foremost_out'",
            "zsteg": f"zsteg '{local_path}'",
            "steghide": f"steghide info '{local_path}' -p '{password}'",
            "outguess": f"outguess -r '{local_path}' '{tmpdir}/outguess_out' && cat '{tmpdir}/outguess_out' 2>/dev/null",
            "exiftool": f"exiftool '{local_path}'",
            "pngcheck": f"pngcheck '{local_path}'"
        }
        results = {}
        for tool, cmd in tools.items():
            results[tool] = run_command(cmd)
        results["stegsolve"] = analyze_stegsolve(local_path)
        return jsonify(results)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
