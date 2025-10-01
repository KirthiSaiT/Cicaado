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
        # Add better error handling and logging
        print(f"Executing command: {cmd}")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
        output = result.stdout + result.stderr
        print(f"Command output: {output}")
        return output
    except subprocess.TimeoutExpired:
        error_msg = "Command timed out after 60 seconds"
        print(error_msg)
        return error_msg
    except Exception as e:
        error_msg = f"Error executing command: {str(e)}"
        print(error_msg)
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
            print(f"Running stegsolve command: {cmd}")
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
        print(f"Stegsolve error: {error_msg}")
        results.append(error_msg)
    return results

@app.route('/process', methods=['POST'])
def process():
    data = request.json
    file_data = data.get('fileData') if data else None
    file_name = data.get('fileName') if data else None
    original_file_id = data.get('originalFileId') if data else None
    
    print(f"Received file_data length: {len(file_data) if file_data else 0}")
    print(f"Received file_name: {file_name}")
    print(f"Received original_file_id: {original_file_id}")
    
    # Validate file data
    if not file_data:
        return jsonify({'error': 'Missing file data'}), 400
    
    # Decode base64 file data
    try:
        file_bytes = base64.b64decode(file_data)
        print(f"Decoded file size: {len(file_bytes)} bytes")
        if len(file_bytes) == 0:
            return jsonify({'error': 'File data is empty'}), 400
    except Exception as e:
        return jsonify({'error': f'Cannot decode file data: {str(e)}'}), 400
    
    # Save file data to a temporary file
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        tmp_file.write(file_bytes)
        local_path = tmp_file.name
    
    print(f"Temporary file created at: {local_path}")
    
    # Ensure file is properly written
    try:
        file_size = os.path.getsize(local_path)
        print(f"Temporary file size: {file_size} bytes")
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
                "cat": f"cat '{local_path}'",
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
                print(f"Running {tool} analysis...")
                results[tool] = run_command(cmd)
                
            results["stegsolve"] = analyze_stegsolve(local_path)
            
            print("All analyses completed successfully")
            return jsonify(results)
    finally:
        # Clean up the temporary file
        if 'local_path' in locals() and os.path.exists(local_path):
            try:
                os.unlink(local_path)
                print(f"Temporary file cleaned up: {local_path}")
            except Exception as e:
                print(f"Failed to clean up temporary file: {e}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)