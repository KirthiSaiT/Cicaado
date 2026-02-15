from flask import Flask, request, jsonify
import tempfile
import os
import subprocess
import base64
from PIL import Image
import io
import shutil
import mimetypes

import mimetypes
from pymongo import MongoClient
import gridfs
from bson.objectid import ObjectId

app = Flask(__name__)

# Connect to MongoDB
MONGO_URI = os.environ.get('MONGODB_URI')
mongo_client = None
if MONGO_URI:
    try:
        mongo_client = MongoClient(MONGO_URI)
        print("[DEBUG] Connected to MongoDB")
    except Exception as e:
        print(f"[ERROR] Could not connect to MongoDB: {e}")


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

        # Return the full output without filtering to match Kali Linux behavior
        if output.strip():
            # Filter out only critical Ruby errors that prevent analysis
            lines = output.split('\n')
            filtered_lines = [line for line in lines if 'NoMethodError' not in line and 'undefined method' not in line and 'spawn' not in line]
            filtered_output = '\n'.join(filtered_lines).strip()
            return filtered_output

        # Handle specific zsteg errors
        if "rb_sysopen" in output:
            return "zsteg internal error (Ruby couldn't open the image file) — likely deleted or inaccessible."

        if "not found" in output.lower():
            return "zsteg tool not found or not available in PATH."

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

def crack_steghide_password_with_stegseek(image_path, wordlist_path="/processor/wordlists/rockyou.txt"):
    """Attempt to crack steghide password using StegSeek with a wordlist."""
    if not is_tool_installed("stegseek"):
        return "StegSeek tool is not installed or not available in PATH"
    
    # Check if file supports steghide (JPEG or BMP)
    if not image_path.lower().endswith(('.jpg', '.jpeg', '.bmp')):
        return "Steghide only works with JPEG and BMP files"
    
    # Check if wordlist exists
    if not os.path.exists(wordlist_path):
        return f"Wordlist not found: {wordlist_path}"
    
    try:
        # Create a unique output file path for extracted data
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        extracted_file_path = f"/tmp/stegseek_output_{unique_id}.txt"
        
        # Debug: Check file properties
        print(f"[DEBUG] Image file path: {image_path}")
        print(f"[DEBUG] Image file size: {os.path.getsize(image_path)} bytes")
        print(f"[DEBUG] Image file extension: {os.path.splitext(image_path)[1]}")
        
        # Debug: Verify this is a valid image file
        try:
            from PIL import Image
            img = Image.open(image_path)
            print(f"[DEBUG] Image dimensions: {img.size}")
            print(f"[DEBUG] Image mode: {img.mode}")
            img.close()
            print(f"[DEBUG] File verified as valid image")
        except Exception as e:
            print(f"[DEBUG] Warning: Image validation failed: {e}")
            # Continue anyway as the steganalysis tools might still work
        
        # Run StegSeek with the wordlist
        # StegSeek command: stegseek -q <image_file> <wordlist> [<output_file>]
        cmd = f"stegseek -q '{image_path}' '{wordlist_path}' '{extracted_file_path}'"
        print(f"[DEBUG] Running StegSeek command: {cmd}")
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)  # 5 minute timeout
        output = result.stdout + result.stderr
        print(f"[DEBUG] StegSeek output: {output}")
        print(f"[DEBUG] StegSeek return code: {result.returncode}")
        
        # Debug: Check if output file was created
        if os.path.exists(extracted_file_path):
            print(f"[DEBUG] Extracted file created, size: {os.path.getsize(extracted_file_path)} bytes")
        else:
            print(f"[DEBUG] No extracted file was created")
        
        # Check if StegSeek found the password
        # StegSeek returns 0 on success, 1 on failure to find password, 2 on error
        if result.returncode == 0:
            # Success! Password found
            # Try to extract the password from the output
            lines = output.split('\n')
            password = None
            
            # Look for the password in the output
            # StegSeek typically outputs the password to stdout
            for line in lines:
                line = line.strip()
                # Skip empty lines and status messages
                if not line or line.startswith("StegSeek") or line.startswith("Progress") or "trying" in line.lower():
                    continue
                    
                # If we have a line that's not a status message, it's likely the password
                if line and not password:
                    password = line
                    break
            
            # Try to read the extracted data
            extracted_data = ""
            if os.path.exists(extracted_file_path):
                try:
                    with open(extracted_file_path, 'rb') as f:
                        # Read as binary and try to decode as text
                        raw_data = f.read()
                        try:
                            extracted_data = raw_data.decode('utf-8')
                        except UnicodeDecodeError:
                            # If UTF-8 fails, try latin-1 or show as hex
                            try:
                                extracted_data = raw_data.decode('latin-1')
                            except UnicodeDecodeError:
                                extracted_data = f"Binary data: {raw_data.hex()}"
                    # Clean up extracted file
                    os.remove(extracted_file_path)
                except Exception as e:
                    extracted_data = f"Could not read extracted data: {str(e)}"
            else:
                extracted_data = "No extracted data file found"
            
            return {
                "password_found": True,
                "password": password or "unknown",
                "extracted_data": extracted_data[:500] + "..." if len(extracted_data) > 500 else extracted_data,
                "message": f"Password cracked! Found password: '{password}'" if password else "Password cracked! But password could not be determined."
            }
        elif result.returncode == 1:
            # No password found
            # Clean up any potential output files
            if os.path.exists(extracted_file_path):
                try:
                    os.remove(extracted_file_path)
                except:
                    pass
                    
            return {
                "password_found": False,
                "password": None,
                "extracted_data": None,
                "message": "Password cracking completed. No password found in wordlist."
            }
        else:
            # Error occurred
            # Clean up any potential output files
            if os.path.exists(extracted_file_path):
                try:
                    os.remove(extracted_file_path)
                except:
                    pass
                    
            return {
                "password_found": False,
                "password": None,
                "extracted_data": None,
                "message": f"StegSeek execution failed with return code {result.returncode}: {output[:500]}..."
            }
    except subprocess.TimeoutExpired:
        return {
            "password_found": False,
            "password": None,
            "extracted_data": None,
            "message": "StegSeek timed out after 5 minutes"
        }
    except Exception as e:
        return {
            "password_found": False,
            "password": None,
            "extracted_data": None,
            "message": f"StegSeek execution failed: {str(e)}"
        }

def crack_steghide_password(image_path):
    """Attempt to crack steghide password using a dictionary attack."""
    # First try StegSeek if available and wordlist exists
    wordlist_path = "/processor/wordlists/rockyou.txt"
    if is_tool_installed("stegseek") and os.path.exists(wordlist_path):
        result = crack_steghide_password_with_stegseek(image_path, wordlist_path)
        # If StegSeek found a password, return the result
        if isinstance(result, dict) and result.get("password_found"):
            return result
        # If StegSeek didn't find a password, fall back to the basic dictionary attack
    
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

def get_file_extension_from_mime(content_type, original_filename):
    """Get appropriate file extension based on content type and original filename"""
    # First, try to get extension from the original filename
    if original_filename:
        _, ext = os.path.splitext(original_filename.lower())
        if ext:
            return ext
    
    # If that doesn't work, try to guess from content type
    if content_type:
        # Handle common image types
        mime_to_ext = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/bmp': '.bmp',
            'image/tiff': '.tiff',
            'image/webp': '.webp'
        }
        if content_type.lower() in mime_to_ext:
            return mime_to_ext[content_type.lower()]
        
        # Try to guess extension from MIME type
        ext = mimetypes.guess_extension(content_type)
        if ext:
            return ext
    
    # Default to .bin if we can't determine
    return '.bin'

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "cicaado-processor"}), 200

@app.route('/process', methods=['POST'])
def process():
    data = request.json
    file_data = data.get('fileData') if data else None
    file_name = data.get('fileName') if data else None
    content_type = data.get('contentType') if data else None
    original_file_id = data.get('originalFileId') if data else None
    
    # Validate file data or ID
    if not file_data and not original_file_id:
        return jsonify({'error': 'Missing file data or originalFileId'}), 400
    
    file_bytes = None
    
    # FETCH FROM MONGODB (Optimized Path)
    if not file_data and original_file_id and mongo_client:
        try:
            print(f"[DEBUG] Fetching file directly from MongoDB GridFS: {original_file_id}")
            # Try to get database from URI, fallback to 'test' if not specified
            try:
                db = mongo_client.get_database()
            except Exception:
                # If URI doesn't have a database, get_database() might fail or return None depending on version
                print("[WARN] No default database in URI, falling back to 'test'")
                db = mongo_client.get_database("test")

            fs = gridfs.GridFS(db, collection="uploads") # Assuming 'uploads' bucket
            
            # Read from GridFS
            try:
                grid_out = fs.get(ObjectId(original_file_id))
                file_bytes = grid_out.read()
                
                # Update metadata if missing
                if not file_name:
                    file_name = grid_out.filename
                if not content_type:
                    content_type = getattr(grid_out, 'contentType', None)
                    
                print(f"[DEBUG] Successfully fetched from MongoDB. Size: {len(file_bytes)} bytes")
            except gridfs.errors.NoFile:
                return jsonify({'error': 'File not found in GridFS'}), 404
                
        except Exception as e:
             # Fallback or error
             print(f"[ERROR] MongoDB Fetch Failed: {e}")
             return jsonify({'error': f'Failed to fetch from MongoDB: {str(e)}'}), 500

    # DECODE BASE64 (Legacy/Direct Path)
    if file_bytes is None and file_data:
        try:
            file_bytes = base64.b64decode(file_data)
        except Exception as e:
            return jsonify({'error': f'Cannot decode file data: {str(e)}'}), 400

    if not file_bytes or len(file_bytes) == 0:
         return jsonify({'error': 'File data is empty'}), 400
         
    print(f"File data ready. Size: {len(file_bytes)} bytes")
    
    # Validate that the decoded data matches expected size if provided
    expected_size = data.get('fileSize') if data else None
    if expected_size and len(file_bytes) != expected_size:
        print(f"Warning: File size mismatch. Expected: {expected_size}, Actual: {len(file_bytes)}")
    
    # Save file data to a temporary file with proper extension
    tmp_file = None
    local_path = None
    try:
        # Preserve the exact original extension - this is critical for steganalysis tools
        file_extension = ""
        if file_name and '.' in file_name:
            file_extension = os.path.splitext(file_name)[1]
        else:
            # Try to determine extension from content type if not in filename
            file_extension = get_file_extension_from_mime(content_type, file_name)
        
        # Validate that we have a proper extension for steganalysis tools
        supported_extensions = {'.png': '.png', '.bmp': '.bmp', '.jpg': '.jpg', '.jpeg': '.jpg', '.gif': '.gif'}
        if file_extension.lower() in supported_extensions:
            # Use the exact original extension to preserve file format
            normalized_extension = file_extension
        else:
            # For unsupported extensions, try to map to a supported one based on content type
            if content_type:
                if 'image/jpeg' in content_type or 'image/jpg' in content_type:
                    normalized_extension = '.jpg'
                elif 'image/png' in content_type:
                    normalized_extension = '.png'
                elif 'image/bmp' in content_type:
                    normalized_extension = '.bmp'
                elif 'image/gif' in content_type:
                    normalized_extension = '.gif'
                else:
                    # Default to .jpg for unknown image types
                    normalized_extension = '.jpg' if content_type and content_type.startswith('image/') else file_extension
            else:
                normalized_extension = file_extension
        
        # Create temporary file with the exact same extension as the original
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=normalized_extension)
        tmp_file.write(file_bytes)
        tmp_file.flush()  # Ensure data is written
        local_path = tmp_file.name
        print(f"Created temporary file: {local_path}")
        print(f"Original filename: {file_name}")
        print(f"File extension used: {normalized_extension}")
        print(f"File size: {len(file_bytes)} bytes")
        
        # Verify file was written correctly
        written_size = os.path.getsize(local_path)
        if written_size != len(file_bytes):
            print(f"Warning: File write verification failed. Expected: {len(file_bytes)}, Written: {written_size}")
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
        print(f"Temporary file size: {file_size} bytes")
        if file_size == 0:
            os.unlink(local_path)  # Clean up
            return jsonify({'error': 'Temporary file is empty'}), 400
            
        # Additional verification: try to open as image if it's supposed to be one
        if content_type and content_type.startswith('image/'):
            try:
                img = Image.open(local_path)
                print(f"Image verification successful. Dimensions: {img.size}, Mode: {img.mode}")
                img.close()
            except Exception as img_error:
                print(f"Warning: Image verification failed: {img_error}")
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
                
            # Steghide info check removed as per user request
            # if is_tool_installed("steghide"): ...
                
            tools["exiftool"] = f"exiftool '{local_path}' 2>&1 || echo 'Exiftool failed'"
            tools["pngcheck"] = f"pngcheck '{local_path}' 2>&1 || echo 'PNGCheck failed or not a PNG file'"
            
            results = {}
            for tool, cmd in tools.items():
                print(f"[DEBUG] Running tool: {tool}")
                results[tool] = run_command(cmd)
                print(f"[DEBUG] Finished tool: {tool}")

            # Run zsteg separately to ensure file is still available
            if is_tool_installed("zsteg"):
                print("[DEBUG] Running additional tool: zsteg")
                results["zsteg"] = run_zsteg_command(local_path)
            else:
                results["zsteg"] = "zsteg tool is not installed or not available in PATH"
                
            # Add steghide password cracking for supported file types
            if is_tool_installed("steghide") and local_path.lower().endswith(('.jpg', '.jpeg', '.bmp')):
                print("[DEBUG] Starting StegSeek password cracking (this may take time)...")
                results["steghide_crack"] = crack_steghide_password(local_path)
                print("[DEBUG] Finished StegSeek password cracking")
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