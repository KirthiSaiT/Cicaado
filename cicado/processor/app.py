from flask import Flask, request, jsonify
import tempfile
import os
import subprocess
import base64
from PIL import Image
import io
import shutil

app = Flask(__name__)

def is_tool_installed(tool_name):
    """Check if a tool is installed and available in PATH"""
    return shutil.which(tool_name) is not None

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

def run_zsteg_command(image_path):
    """Run zsteg safely with better error diagnostics."""
    try:
        # Check if file exists and is accessible
        if not os.path.exists(image_path):
            return f"File not found: {image_path}"

        # Check file extension
        if not image_path.lower().endswith(('.png', '.bmp', '.jpg', '.jpeg', '.gif')):
            return f"Unsupported file format: {image_path}"

        # Check if file is empty
        if os.path.getsize(image_path) == 0:
            return "File is empty"

        # Properly escape the file path for shell execution
        cmd = f'zsteg "{image_path}" 2>&1'
        print(f"[DEBUG] Running command: {cmd}")

        # Execute zsteg with proper error handling
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=60
        )

        # Combine stdout and stderr
        output = result.stdout + result.stderr

        # Handle specific zsteg errors
        if "rb_sysopen" in output:
            return "zsteg internal error (Ruby couldn't open the image file) — likely deleted or inaccessible."

        if "not found" in output.lower():
            return "zsteg tool not found or not in PATH."

        if "error" in output.lower() and not output.strip().startswith("b'"):
            return f"zsteg error: {output.strip()}"

        # Return successful output
        return output.strip() or "No hidden data found."

    except subprocess.TimeoutExpired:
        return "zsteg timed out after 60s"
    except Exception as e:
        return f"zsteg execution failed: {str(e)}"

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
            "LSB of Red plane",
            "LSB of Green plane",
            "LSB of Blue plane"
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
    
    # Save file data to a temporary file with proper extension
    tmp_file = None
    local_path = None
    try:
        # Extract file extension from the original file name
        file_extension = ''
        if file_name:
            file_extension = os.path.splitext(file_name)[1]
        
        # If no extension or invalid extension, default to .png
        if not file_extension or file_extension.lower() not in ['.png', '.bmp', '.jpg', '.jpeg', '.gif']:
            file_extension = '.png'
        
        # Create temporary file with proper extension
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
        tmp_file.write(file_bytes)
        tmp_file.flush()  # Ensure data is written
        local_path = tmp_file.name
    except Exception as e:
        if tmp_file:
            tmp_file.close()
        return jsonify({'error': f'Cannot create temporary file: {str(e)}'}), 400
    finally:
        if tmp_file:
            tmp_file.close()
    
    # Ensure file is properly written
    try:
        file_size = os.path.getsize(local_path)
        if file_size == 0:
            os.unlink(local_path)  # Clean up
            return jsonify({'error': 'Temporary file is empty'}), 400
    except Exception as e:
        if local_path and os.path.exists(local_path):
            os.unlink(local_path)  # Clean up
        return jsonify({'error': f'Cannot access temporary file: {str(e)}'}), 400
    
    try:
        # Create a temporary directory for output files
        with tempfile.TemporaryDirectory() as tmpdir:
            # Define tools with proper checks
            tools = {
                "cat": f"cat '{local_path}'",
                "strings": f"strings -n 4 '{local_path}' || echo 'Strings command failed or no output'",
                "binwalk": f"binwalk '{local_path}'"
            }
            
            # Add conditional tools based on availability with better error messages
            if is_tool_installed("foremost"):
                tools["foremost"] = f"foremost -T -i '{local_path}' -o '{tmpdir}/foremost_out' && find '{tmpdir}/foremost_out' 2>/dev/null || echo 'Foremost analysis complete but no data found'"
            else:
                tools["foremost"] = "echo 'Foremost tool is not installed or not available in PATH'"
                
            if is_tool_installed("zsteg"):
                # Use our custom function for better error handling
                tools["zsteg"] = run_zsteg_command(local_path)
            else:
                tools["zsteg"] = "echo 'Zsteg tool is not installed or not available in PATH'"
                
            if is_tool_installed("steghide"):
                tools["steghide"] = f"steghide info '{local_path}' -p '' 2>&1 || echo 'Steghide analysis complete but no hidden data found'"
            else:
                tools["steghide"] = "echo 'Steghide tool is not installed or not available in PATH'"
                
            tools["exiftool"] = f"exiftool '{local_path}' 2>&1 || echo 'Exiftool failed'"
            tools["pngcheck"] = f"pngcheck '{local_path}' 2>&1 || echo 'PNGCheck failed or not a PNG file'"
            
            results = {}
            for tool, cmd in tools.items():
                results[tool] = run_command(cmd)
                
            # Run zsteg separately to ensure file is still available
            if is_tool_installed("zsteg"):
                results["zsteg"] = run_zsteg_command(local_path)
            else:
                results["zsteg"] = "zsteg tool is not installed or not available in PATH"
                
            results["stegsolve"] = analyze_stegsolve(local_path)
            
            # Clean up the temporary file after all tools have finished
            if local_path and os.path.exists(local_path):
                try:
                    os.unlink(local_path)
                except Exception:
                    pass
            
            return jsonify(results)
    except Exception as e:
        # Clean up the temporary file if there was an error
        if local_path and os.path.exists(local_path):
            try:
                os.unlink(local_path)
            except Exception:
                pass
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)