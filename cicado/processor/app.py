from flask import Flask, request, jsonify
import boto3
import tempfile
import os
import subprocess

app = Flask(__name__)

def run_command(cmd):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
        return result.stdout + result.stderr
    except Exception as e:
        return str(e)

@app.route('/process', methods=['POST'])
def process():
    data = request.json
    s3_key = data.get('key')
    password = data.get('password', '')
    bucket = os.environ.get('AWS_S3_BUCKET_NAME')

    if not s3_key or not bucket:
        return jsonify({'error': 'Missing S3 key or bucket'}), 400

    s3 = boto3.client('s3')
    with tempfile.TemporaryDirectory() as tmpdir:
        local_path = os.path.join(tmpdir, os.path.basename(s3_key))
        try:
            s3.download_file(bucket, s3_key, local_path)
        except Exception as e:
            return jsonify({
                'error': f"Failed to download '{s3_key}' from '{bucket}': {str(e)}"
            }), 500

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

        return jsonify(results)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
