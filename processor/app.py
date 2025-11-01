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

        # Even if zsteg has internal errors, if it produced analysis results, return them
        if output.strip():
            # Look for actual steganography findings
            if "bytes of extra data" in output:
                # Extract the important analysis information
                lines = output.split('\n')
                analysis_lines = []
                for line in lines:
                    # Keep lines with analysis findings
                    if "bytes of extra data" in line or line.startswith("b") or "[?]" in line:
                        analysis_lines.append(line)
                    # Skip Ruby error lines
                    elif "NoMethodError" in line or "undefined method" in line or "spawn" in line:
                        continue
                if analysis_lines:
                    return "\n".join(analysis_lines)
            
            # If we have output but no specific findings, filter out Ruby errors
            lines = output.split('\n')
            filtered_lines = [line for line in lines if 'NoMethodError' not in line and 'undefined method' not in line and 'spawn' not in line]
            filtered_output = '\n'.join(filtered_lines).strip()
            if filtered_output:
                return filtered_output

        # Handle specific zsteg errors
        if "rb_sysopen" in output:
            return "zsteg internal error (Ruby couldn't open the image file) — likely deleted or inaccessible."

        if "not found" in output.lower():
            return "zsteg tool not found or not in PATH."

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

def crack_steghide_password(image_path):
    """Attempt to crack steghide password using a dictionary attack."""
    if not is_tool_installed("steghide"):
        return "Steghide tool is not installed or not available in PATH"
    
    # Common passwords for dictionary attack
    common_passwords = [
        "", "password", "123456", "admin", "root", "toor", "guest", "user", 
        "test", "demo", "secret", "hidden", "steg", "steganography", 
        "hide", "data", "image", "picture", "photo", "file", "document",
        "pass", "key", "unlock", "open", "access", "login", "signin",
        "1234", "0000", "1111", "qwerty", "abc123", "password123",
        "iloveyou", "princess", "rockyou", "dragon", "master", "monkey",
        "letmein", "welcome", "flower", "football", "michael", "shadow",
        "sunshine", "superman", "starwars", "trustno1", "hello", "world",
        "12345", "654321", "password1", "123456789", "987654321", "qwerty123",
        "12345678", "87654321", "9876543210", "0987654321", "asdfgh", "zxcvbnm",
        "qazwsx", "123123", "123321", "112233", "11223344", "1122334455", "112233445566",
        "a123456", "a123456789", "123456a", "123456789a", "abcd1234", "1234abcd",
        "1q2w3e4r", "1qaz2wsx", "qwer1234", "1234qwer", "admin123", "administrator",
        "login123", "root123", "default", "unknown", "public", "private", "system",
        "computer", "internet", "network", "security", "cyber", "hacker", "crack",
        "exploit", "vulnerability", "backdoor", "malware", "trojan", "virus", "worm",
        "botnet", "ransomware", "spyware", "adware", "keylogger", "phishing", "scam",
        "fraud", "identity", "theft", "encryption", "decryption", "cipher", "hash",
        "md5", "sha1", "sha256", "sha512", "aes", "rsa", "pgp", "gpg", "ssl", "tls",
        "https", "http", "ftp", "ssh", "telnet", "smtp", "pop3", "imap", "dns", "dhcp",
        "vpn", "proxy", "firewall", "antivirus", "antimalware", "forensics", "stego",
        "foremost", "binwalk", "exiftool", "pngcheck", "zsteg", "outguess", "camouflage",
        "snow", "crypt", "cryptolab", "stegdetect", "stegbreak", "john", "hydra", "medusa",
        "nmap", "wireshark", "burpsuite", "metasploit", "kali", "parrot", "ubuntu", "debian",
        "windows", "linux", "macos", "android", "ios", "mobile", "desktop", "server",
        "database", "mysql", "postgresql", "mongodb", "redis", "oracle", "mssql", "sqlite",
        "apache", "nginx", "iis", "tomcat", "jboss", "websphere", "weblogic", "glassfish",
        "python", "java", "javascript", "php", "ruby", "perl", "csharp", "cplus", "cplusplus",
        "assembly", "machine", "binary", "hex", "octal", "decimal", "base64", "ascii",
        "unicode", "utf8", "utf16", "utf32", "encoding", "decoding", "compression", "zip",
        "rar", "7zip", "tar", "gzip", "bzip2", "xz", "lzma", "cab", "iso", "img", "dmg",
        "exe", "dll", "sys", "bat", "cmd", "sh", "bash", "zsh", "fish", "powershell", "ps1",
        "html", "css", "xml", "json", "yaml", "yml", "ini", "conf", "config", "txt", "log",
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf",
        "jpg", "jpeg", "png", "gif", "bmp", "tiff", "svg", "ico", "raw", "cr2", "nef", "arw",
        "mp3", "wav", "flac", "aac", "ogg", "wma", "m4a", "mp4", "avi", "mkv", "mov", "wmv",
        "flv", "webm", "3gp", "mpg", "mpeg", "m2ts", "ts", "vob", "ifo", "bup"
    ]
    
    # Check if file supports steghide (JPEG or BMP)
    if not image_path.lower().endswith(('.jpg', '.jpeg', '.bmp')):
        return "Steghide only works with JPEG and BMP files"
    
    # Determine file format for steghide
    if image_path.lower().endswith(('.jpg', '.jpeg')):
        file_format = "JPEG"
    else:
        file_format = "BMP"
    
    # Try each password
    for password in common_passwords:
        try:
            # Escape password for shell
            escaped_password = password.replace("'", "'\"'\"'")
            cmd = f"steghide extract -sf '{image_path}' -p '{escaped_password}' -xf '/tmp/steghide_output.txt' -f -q 2>&1"
            
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            output = result.stdout + result.stderr
            
            # Check if extraction was successful
            if "wrote extracted data to" in output.lower() or "the same directory" in output.lower():
                # Try to read the extracted data
                try:
                    with open('/tmp/steghide_output.txt', 'r') as f:
                        extracted_data = f.read()
                    # Clean up
                    if os.path.exists('/tmp/steghide_output.txt'):
                        os.remove('/tmp/steghide_output.txt')
                    return {
                        "password_found": True,
                        "password": password,
                        "extracted_data": extracted_data[:500] + "..." if len(extracted_data) > 500 else extracted_data,
                        "message": f"Password cracked! Found password: '{password}'"
                    }
                except Exception as e:
                    # Clean up
                    if os.path.exists('/tmp/steghide_output.txt'):
                        os.remove('/tmp/steghide_output.txt')
                    return {
                        "password_found": True,
                        "password": password,
                        "extracted_data": "Could not read extracted data",
                        "message": f"Password cracked! Found password: '{password}' but could not read data"
                    }
            elif "could not extract" in output.lower() or "steghide" in output.lower() and "no" in output.lower():
                # Password didn't work, continue to next
                continue
            else:
                # Some other output, might be a hit
                if len(output.strip()) > 0 and "no" not in output.lower() and "could not" not in output.lower():
                    # Try to read any potential output file
                    if os.path.exists('/tmp/steghide_output.txt'):
                        try:
                            with open('/tmp/steghide_output.txt', 'r') as f:
                                extracted_data = f.read()
                            # Clean up
                            os.remove('/tmp/steghide_output.txt')
                            return {
                                "password_found": True,
                                "password": password,
                                "extracted_data": extracted_data[:500] + "..." if len(extracted_data) > 500 else extracted_data,
                                "message": f"Password cracked! Found password: '{password}'"
                            }
                        except Exception:
                            # Clean up
                            if os.path.exists('/tmp/steghide_output.txt'):
                                os.remove('/tmp/steghide_output.txt')
        except subprocess.TimeoutExpired:
            continue
        except Exception as e:
            continue
    
    # Clean up any remaining files
    if os.path.exists('/tmp/steghide_output.txt'):
        os.remove('/tmp/steghide_output.txt')
    
    return {
        "password_found": False,
        "password": None,
        "extracted_data": None,
        "message": "Password cracking completed. No password found in dictionary."
    }

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
            file_extension = os.path.splitext(file_name)[1].lower()
        
        # Validate and normalize file extension for all tools
        supported_extensions = {'.png': '.png', '.bmp': '.bmp', '.jpg': '.jpg', '.jpeg': '.jpg', '.gif': '.gif'}
        if file_extension in supported_extensions:
            normalized_extension = supported_extensions[file_extension]
        else:
            # Default to .png for unknown extensions
            normalized_extension = '.png'
        
        # Create temporary file with proper extension
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=normalized_extension)
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
                # Use specific steghide command based on file extension
                if local_path.lower().endswith(('.jpg', '.jpeg')):
                    tools["steghide"] = f"steghide info '{local_path}' -p '' -sf JPEG 2>&1 || echo 'Steghide analysis complete but no hidden data found'"
                elif local_path.lower().endswith('.bmp'):
                    tools["steghide"] = f"steghide info '{local_path}' -p '' -sf BMP 2>&1 || echo 'Steghide analysis complete but no hidden data found'"
                elif local_path.lower().endswith('.wav'):
                    tools["steghide"] = f"steghide info '{local_path}' -p '' -sf WAVE 2>&1 || echo 'Steghide analysis complete but no hidden data found'"
                else:
                    # Default to auto-detection
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
                
            # Add steghide password cracking for supported file types
            if is_tool_installed("steghide") and local_path.lower().endswith(('.jpg', '.jpeg', '.bmp')):
                results["steghide_crack"] = crack_steghide_password(local_path)
            else:
                results["steghide_crack"] = "Steghide password cracking not available for this file type or steghide not installed"
                
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