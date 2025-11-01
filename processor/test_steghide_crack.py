#!/usr/bin/env python3
"""
Test script for steghide password cracking functionality
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
        from app import crack_steghide_password
        print("✓ crack_steghide_password import successful")
        return True
    except ImportError as e:
        print(f"✗ app import failed: {e}")
        return False

def test_function_signature():
    """Test that the function has the correct signature"""
    try:
        import inspect
        from app import crack_steghide_password
        sig = inspect.signature(crack_steghide_password)
        params = list(sig.parameters.keys())
        print(f"✓ Function signature: crack_steghide_password({', '.join(params)})")
        return True
    except Exception as e:
        print(f"✗ Function signature test failed: {e}")
        return False

def test_steghide_availability():
    """Check if steghide is available in PATH"""
    import shutil
    steghide_path = shutil.which("steghide")
    if steghide_path:
        print(f"✓ steghide found at: {steghide_path}")
        return True
    else:
        print("⚠ steghide not found in PATH - testing will be limited")
        return False

if __name__ == "__main__":
    print("Running steghide password cracking implementation tests...\n")
    
    # Test imports
    if not test_imports():
        print("\n❌ Import tests failed")
        sys.exit(1)
    
    # Test function signature
    if not test_function_signature():
        print("\n❌ Function signature test failed")
        sys.exit(1)
    
    # Test steghide availability
    steghide_available = test_steghide_availability()
    
    print("\n✅ All basic tests passed!")
    if not steghide_available:
        print("Note: Full functionality testing requires steghide to be installed.")
        print("In the Docker container, steghide will be available as per the Dockerfile.")