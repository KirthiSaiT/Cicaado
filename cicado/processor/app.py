from flask import Flask, request, jsonify
import tempfile
import os
import subprocess
import base64
from PIL import Image
import io
import urllib.parse

app = Flask(__name__)

def run_command(cmd):
    try:
        # Execute command and capture output
        result = subprocess.run(cmd, shell=True, capture_output=True, timeout=60)
        # Handle both text and binary output appropriately
        try:
            # Try to decode as UTF-8 for text output
            output = result.stdout.decode('utf-8') + result.stderr.decode('utf-8')
        except UnicodeDecodeError:
            # For binary data, convert to hex representation for display
            output = result.stdout[:1000].hex()  # Show first 1000 bytes as hex
        return output
    except subprocess.TimeoutExpired:
        error_msg = "Command timed out after 60 seconds"
        return error_msg
    except Exception as e:
        error_msg = f"Error executing command: {str(e)}"
        return error_msg

def analyze_stegsolve(image_path):
    results = []
    try:
        # Check if stegsolve.jar exists
        if not os.path.exists("/usr/local/bin/stegsolve.jar"):
            return [{"error": "Stegsolve not available"}]
        
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
            cmd = f"java -jar /usr/local/bin/stegsolve.jar -s '{mode}' -o /tmp/stegsolve_out.png '{image_path}'"
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
        error_msg = {"error": str(e)}
        results.append(error_msg)
    return results

@app.route('/process', methods=['POST'])
def process():
    data = request.json
    file_data = data.get('fileData') if data else None
    file_name = data.get('fileName') if data else None
    original_file_id = data.get('originalFileId') if data else None
    
    # Validate file data
    if not file_data:
        return jsonify({'error': 'Missing file data'}), 400
    
    # Decode base64 file data
    try:
        file_bytes = base64.b64decode(file_data)
        if len(file_bytes) == 0:
            return jsonify({'error': 'File data is empty'}), 400
    except Exception as e:
        return jsonify({'error': f'Cannot decode file data: {str(e)}'}), 400
    
    # Save file data to a temporary file
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        tmp_file.write(file_bytes)
        local_path = tmp_file.name
    
    # Ensure file is properly written
    try:
        file_size = os.path.getsize(local_path)
        if file_size == 0:
            os.unlink(local_path)  # Clean up
            return jsonify({'error': 'Temporary file is empty'}), 400
    except Exception as e:
        os.unlink(local_path)  # Clean up
        return jsonify({'error': f'Cannot access temporary file: {str(e)}'}), 400
    
    try:
        # Create a temporary directory for output files
        with tempfile.TemporaryDirectory() as tmpdir:
            tools = {
                "cat": f"cat '{local_path}'",  # Show full output, handle in run_command
                "strings": f"strings -n 4 '{local_path}' || echo 'Strings command failed or no output'",
                "binwalk": f"binwalk '{local_path}'",
                "foremost": f"foremost -T -i '{local_path}' -o '{tmpdir}/foremost_out' && find '{tmpdir}/foremost_out' 2>/dev/null || echo 'Foremost failed or no output'",
                "zsteg": f"zsteg '{local_path}' 2>&1 || echo 'Zsteg failed or no output'",
                "steghide": f"steghide info '{local_path}' -p '' 2>&1 || echo 'Steghide failed or no hidden data'",
                "outguess": f"outguess -r '{local_path}' '{tmpdir}/outguess_out' 2>/dev/null && cat '{tmpdir}/outguess_out' 2>/dev/null || echo 'Outguess failed or no hidden data'",
                "exiftool": f"exiftool '{local_path}' 2>&1 || echo 'Exiftool failed'",
                "pngcheck": f"pngcheck '{local_path}' 2>&1 || echo 'PNGCheck failed or not a PNG file'"
            }
            
            results = {}
            for tool, cmd in tools.items():
                results[tool] = run_command(cmd)
                
            results["stegsolve"] = analyze_stegsolve(local_path)
            
            return jsonify(results)
    finally:
        # Clean up the temporary file
        if 'local_path' in locals() and os.path.exists(local_path):
            try:
                os.unlink(local_path)
            except Exception:
                pass

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)