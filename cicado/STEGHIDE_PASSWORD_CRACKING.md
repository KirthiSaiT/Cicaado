# Steghide Password Cracking Feature

## Overview

This document explains the implementation of the steghide password cracking functionality in the steganography analysis platform.

## How It Works

When a user uploads a JPEG or BMP image, the system automatically performs password cracking using StegSeek (if available) or steghide to detect and extract hidden data protected by a password.

### Process Flow

1. User uploads a JPEG or BMP image file
2. File is stored in MongoDB GridFS
3. Processor service receives the file data
4. Automatic steghide analysis runs:
   - Standard steghide info command to detect embedded data
   - Password cracking using StegSeek with RockYou wordlist (if available)
   - Fallback to dictionary attack using common passwords (if StegSeek is not available or fails)
5. If a password is found:
   - Extracts the hidden data
   - Returns both the password and extracted data
6. Results are displayed in the UI

### Password Cracking Methods

The system uses two methods for password cracking:

1. **StegSeek with RockYou wordlist** (preferred):
   - Uses the StegSeek tool which is optimized for steghide password cracking
   - Employs the comprehensive RockYou wordlist containing over 14 million passwords
   - Much faster and more effective than the basic dictionary attack

2. **Basic dictionary attack** (fallback):
   - Uses steghide directly with a smaller dictionary of common passwords
   - Contains over 300 commonly used passwords
   - Used when StegSeek is not available or fails to find a password

### Supported File Types

- JPEG (.jpg, .jpeg)
- BMP (.bmp)

These are the only file formats supported by steghide.

## Technical Implementation

### Backend (Python Flask Service)

The `crack_steghide_password()` function in `processor/app.py`:

1. First attempts to use StegSeek with the RockYou wordlist if available
2. Falls back to the basic dictionary attack if StegSeek is not available or fails
3. Validates that steghide is installed and available (for fallback method)
4. Checks that the file is a supported format
5. For StegSeek method, executes:
   ```bash
   stegseek <file> /usr/share/wordlists/rockyou.txt
   ```
6. For basic dictionary method, iterates through the password dictionary
7. For each password in the dictionary, executes:
   ```bash
   steghide extract -sf <file> -p <password> -xf /tmp/steghide_output.txt -f -q
   ```
8. Checks if extraction was successful
9. If successful, reads and returns the extracted data
10. Cleans up temporary files

### Frontend Integration

The results are displayed in the UI through the Upload component:
- Shows "Password Found" with the cracked password
- Displays the extracted hidden data
- Provides clear success/failure indicators

## Security Considerations

1. All file paths are properly escaped to prevent shell injection
2. Temporary files are cleaned up after processing
3. Processing timeouts prevent resource exhaustion
4. Only supported file types are processed

## Performance

- StegSeek with RockYou wordlist: Usually completes in seconds
- Basic dictionary attack: Each password attempt has a 30-second timeout
- Processing stops as soon as a password is found
- RockYou wordlist provides much better coverage than the basic dictionary

## Limitations

1. Only works with JPEG and BMP files (steghide limitation)
2. May not find passwords that are not in the wordlist/dictionary
3. Processing time depends on the size of the wordlist/dictionary and file

## Future Enhancements

- Add brute force option for alphanumeric passwords
- Allow users to provide custom password lists
- Implement parallel processing for faster cracking
- Add support for other steganography tools with password protection