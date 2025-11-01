# Steghide Password Cracking Feature

## Overview

This document explains the implementation of the steghide password cracking functionality in the steganography analysis platform.

## How It Works

When a user uploads a JPEG or BMP image, the system automatically performs a dictionary attack using steghide to detect and extract hidden data protected by a password.

### Process Flow

1. User uploads a JPEG or BMP image file
2. File is stored in MongoDB GridFS
3. Processor service receives the file data
4. Automatic steghide analysis runs:
   - Standard steghide info command to detect embedded data
   - Dictionary attack using common passwords
5. If a password is found:
   - Extracts the hidden data
   - Returns both the password and extracted data
6. Results are displayed in the UI

### Dictionary Attack

The system uses a comprehensive dictionary of common passwords including:
- Default passwords ("password", "123456", "admin", etc.)
- Common words and phrases
- Technical terms related to cybersecurity
- File extensions and common filenames

The dictionary contains over 300 commonly used passwords to maximize the chances of finding the correct password.

### Supported File Types

- JPEG (.jpg, .jpeg)
- BMP (.bmp)

These are the only file formats supported by steghide.

## Technical Implementation

### Backend (Python Flask Service)

The `crack_steghide_password()` function in `processor/app.py`:

1. Validates that steghide is installed and available
2. Checks that the file is a supported format
3. Iterates through the password dictionary
4. For each password, executes:
   ```bash
   steghide extract -sf <file> -p <password> -xf /tmp/steghide_output.txt -f -q
   ```
5. Checks if extraction was successful
6. If successful, reads and returns the extracted data
7. Cleans up temporary files

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

- Each password attempt has a 30-second timeout
- Processing stops as soon as a password is found
- Dictionary is limited to balance effectiveness with performance

## Limitations

1. Only works with JPEG and BMP files (steghide limitation)
2. Only finds passwords in the dictionary (does not perform brute force)
3. May not find passwords that are not in the dictionary
4. Processing time depends on the size of the dictionary and file

## Future Enhancements

- Add brute force option for alphanumeric passwords
- Allow users to provide custom password lists
- Implement parallel processing for faster cracking
- Add support for other steganography tools with password protection