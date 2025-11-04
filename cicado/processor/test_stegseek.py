#!/usr/bin/env python3
"""
Test script for StegSeek password cracking functionality
"""

import tempfile
import os
import sys

def test_imports():
    """Test that all required modules can be imported"""
    try:
        from flask import Flask
        print("✓ Flask import successful")
    except ImportError as e:
        print(f"✗ Flask import failed: {e}")
        return False
        
    try:
        import subprocess
        print("✓ subprocess import successful")
    except ImportError as e:
        print(f"✗ subprocess import failed: {e}")
        return False
        
    try:
        from app import crack_steghide_password_with_stegseek
        print("✓ crack_steghide_password_with_stegseek import successful")
        return True
    except ImportError as e:
        print(f"✗ app import failed: {e}")
        return False

def test_function_signature():
    """Test that the function has the correct signature"""
    try:
        import inspect
        from app import crack_steghide_password_with_stegseek
        sig = inspect.signature(crack_steghide_password_with_stegseek)
        params = list(sig.parameters.keys())
        print(f"✓ Function signature: crack_steghide_password_with_stegseek({', '.join(params)})")
        return True
    except Exception as e:
        print(f"✗ Function signature test failed: {e}")
        return False

def test_stegseek_availability():
    """Check if StegSeek is available in PATH"""
    import shutil
    stegseek_path = shutil.which("stegseek")
    if stegseek_path:
        print(f"✓ StegSeek found at: {stegseek_path}")
        return True
    else:
        print("⚠ StegSeek not found in PATH - testing will be limited")
        return False

def test_wordlist_availability():
    """Check if rockyou.txt wordlist is available"""
    wordlist_path = "/usr/share/wordlists/rockyou.txt"
    if os.path.exists(wordlist_path):
        print(f"✓ RockYou wordlist found at: {wordlist_path}")
        # Check file size
        size = os.path.getsize(wordlist_path)
        print(f"  Wordlist size: {size} bytes ({size/1024/1024:.1f} MB)")
        return True
    else:
        print("⚠ RockYou wordlist not found - testing will be limited")
        return False

if __name__ == "__main__":
    print("Running StegSeek password cracking implementation tests...\n")
    
    # Test imports
    if not test_imports():
        print("\n❌ Import tests failed")
        sys.exit(1)
    
    # Test function signature
    if not test_function_signature():
        print("\n❌ Function signature test failed")
        sys.exit(1)
    
    # Test StegSeek availability
    stegseek_available = test_stegseek_availability()
    
    # Test wordlist availability
    wordlist_available = test_wordlist_availability()
    
    print("\n✅ All basic tests passed!")
    if not stegseek_available:
        print("Note: Full functionality testing requires StegSeek to be installed.")
        print("In the Docker container, StegSeek will be available as per the Dockerfile.")
    if not wordlist_available:
        print("Note: Full functionality testing requires the rockyou.txt wordlist.")
        print("In the Docker container, the wordlist will be downloaded as per the Dockerfile.")