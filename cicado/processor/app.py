from flask import Flask, request, jsonify
import tempfile
import os
import subprocess
import base64
from PIL import Image
import io
import shutil

app = Flask(__name__)

# ------------------ Utility Functions ------------------

def is_tool_installed(tool_name):
    """Check if a tool is installed and available in PATH"""
    return shutil.which(tool_name) is not None

def run_command(cmd):
    """Safely execute shell commands with timeout and error handling"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, timeout=60)
        try:
            output = result.stdout.decode('utf-8') + result.stderr.decode('utf-8')
        except UnicodeDecodeError:
            output = result.stdout[:1000].hex()
        return output or "No output returned"
    except subprocess.TimeoutExpired:
        return "Command timed out after 60 seconds"
    except Exception as e:
        return f"Error executing command: {str(e)}"

# ------------------ Zsteg Function ------------------

def run_zsteg_command(image_path):
    """Run zsteg with proper error handling"""
    try:
        if not image_path.lower().endswith(('.png', '.bmp', '.jpg', '.jpeg', '.gif')):
            return "zsteg only supports PNG, BMP, JPG, JPEG, and GIF files"
            
        if not os.path.exists(image_path):
            return "Image file not found"
            
        if os.path.getsize(image_path) == 0:
            return "Image file is empty"
            
        if not is_tool_installed("zsteg"):
            return "zsteg tool is not installed or not found in PATH"
            
        cmd = f"zsteg \"{image_path}\" 2>&1"
        print(f"Running zsteg command: {cmd}")
        result = subprocess.run(cmd, shell=True, capture_output=True, timeout=60, text=True)
        output = result.stdout + result.stderr

        if result.returncode != 0:
            if "not found" in output.lower():
                return "zsteg command not found. Please check installation."
            elif "rb_sysopen" in output:
                return "zsteg encountered a file access error (possible version compatibility issue)."
            elif "undefined method" in output:
                return "zsteg failed internally (Ruby version mismatch)."
            elif "uknown param" in output.lower():
                return "zsteg received an unexpected parameter (possibly corrupted image)."
            else:
                return "zsteg analysis complete but no hidden data found"

        return output if output.strip() else "zsteg completed successfully but found no hidden data"
        
    except subprocess.TimeoutExpired:
        return "zsteg command timed out after 60 seconds"
    except Exception as e:
        return f"Error running zsteg: {str(e)}"

# ------------------ Stegsolve Function ------------------

def analyze_stegsolve(image_path):
    """Extract color plane layers using stegsolve.jar if available"""
    results = []
    try:
        stegsolve_path = "/usr/local/bin/stegsolve.jar"
        if not os.path.exists(stegsolve_path):
            return [{"error": "Stegsolve not available"}]
        
        modes = [
            "Red plane 0",
            "Green plane 0",
            "Blue plane 0",
            "LSB of Red plane",
            "LSB of Green plane",
            "LSB of Blue plane"
        ]
        for mode in modes:
            cmd = f"java -jar {stegsolve_path} -s '{mode}' -o /tmp/stegsolve_out.png '{image_path}'"
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

# ------------------ Main Flask Route ------------------

@app.route('/process', methods=['POST'])
def process():
    data = request.json
    file_data = data.get('fileData') if data else None
    file_name = data.get('fileName') if data else None
    
    if not file_data:
        return jsonify({'error': 'Missing file data'}), 400

    try:
        file_bytes = base64.b64decode(file_data)
        if len(file_bytes) == 0:
            return jsonify({'error': 'File data is empty'}), 400
    except Exception as e:
        return jsonify({'error': f'Cannot decode file data: {str(e)}'}), 400

    tmp_file = tempfile.NamedTemporaryFile(delete=False)
    tmp_file.write(file_bytes)
    tmp_file.flush()
    local_path = tmp_file.name
    tmp_file.close()

    if os.path.getsize(local_path) == 0:
        os.unlink(local_path)
        return jsonify({'error': 'Temporary file is empty'}), 400

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # ---------- Run Common Tools ----------
            tools = {
                "cat": f"cat '{local_path}'",
                "strings": f"strings -n 4 '{local_path}' || echo 'Strings command failed or no output'",
                "binwalk": f"binwalk '{local_path}'",
                "foremost": (
                    f"foremost -T -i '{local_path}' -o '{tmpdir}/foremost_out' && find '{tmpdir}/foremost_out' 2>/dev/null || echo 'foremost analysis complete but no data found'"
                    if is_tool_installed('foremost') else
                    "echo 'foremost not installed'"
                ),
                "steghide": (
                    f"steghide info '{local_path}' -p '' 2>&1 || echo 'steghide analysis complete but no hidden data found'"
                    if is_tool_installed('steghide') else
                    "echo 'steghide not installed'"
                ),
                "exiftool": f"exiftool '{local_path}' 2>&1 || echo 'Exiftool failed'",
                "pngcheck": f"pngcheck '{local_path}' 2>&1 || echo 'PNGCheck failed or not a PNG file'"
            }

            results = {}

            for tool, cmd in tools.items():
                results[tool] = run_command(cmd)

            # ---------- Run Zsteg Separately ----------
            if is_tool_installed("zsteg"):
                results["zsteg"] = run_zsteg_command(local_path)
            else:
                results["zsteg"] = "zsteg tool is not installed or not available in PATH"

            # ---------- Run Stegsolve ----------
            results["stegsolve"] = analyze_stegsolve(local_path)

            return jsonify(results)

    finally:
        if local_path and os.path.exists(local_path):
            try:
                os.unlink(local_path)
            except Exception:
                pass

# ------------------ Flask App Runner ------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
