#!/usr/bin/env python3
"""
Creates one test file per module for the Cicaado steganography platform.
Run this in Kali WSL:  python3 create.py
Then upload each file from ~/cicaado_test_files/ to http://localhost:3001
"""
import os, struct, zlib, subprocess, io, zipfile, random

OUT = os.path.expanduser("~/cicaado_test_files")
os.makedirs(OUT, exist_ok=True)


# ── helpers ────────────────────────────────────────────────────────────────────

def make_png(w, h, pixels_rgb: bytes, path):
    """Build a minimal valid PNG from raw RGB bytes."""
    def chunk(name, data):
        c = struct.pack(">I", len(data)) + name + data
        return c + struct.pack(">I", zlib.crc32(name + data) & 0xFFFFFFFF)

    raw = b""
    for y in range(h):
        raw += b"\x00"
        raw += pixels_rgb[y * w * 3 : (y + 1) * w * 3]

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    idat = zlib.compress(raw, 9)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))
    print(f"  [OK] {path}")


def make_jpeg(path):
    """Create a minimal valid JPEG using ImageMagick convert."""
    r = subprocess.run(
        ["convert", "-size", "200x200", "gradient:blue-red", "-quality", "85", path],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print(f"  [WARN] ImageMagick failed: {r.stderr.strip()}")
    else:
        print(f"  [OK] {path}")


def run(cmd, label):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode == 0:
        print(f"  [OK] {label}")
    else:
        print(f"  [WARN] {label} failed: {r.stderr.strip()}")
    return r.returncode == 0


# ── 1. test_basic.png — pngcheck, stegsolve, binwalk, strings, exiftool ───────
print("\n[1] test_basic.png  →  pngcheck, stegsolve, zsteg, exiftool, strings, binwalk")
pixels = b"".join(
    bytes([i % 256, (i * 3) % 256, (i * 7) % 256])
    for i in range(200 * 200)
)
make_png(200, 200, pixels, f"{OUT}/test_basic.png")


# ── 2. test_exif.jpg — exiftool (flag hidden in EXIF Comment) ─────────────────
print("\n[2] test_exif.jpg  →  exiftool  (flag in EXIF Comment field)")
run([
    "convert", "-size", "200x200", "gradient:green-yellow",
    "-set", "EXIF:Make",    "TestCamera",
    "-set", "EXIF:Model",   "CicaadoTest v1",
    "-set", "EXIF:Artist",  "CTF Player",
    "-set", "EXIF:Comment", "Flag: TEST{exiftool_works_correctly}",
    f"{OUT}/test_exif.jpg"
], f"{OUT}/test_exif.jpg")


# ── 3. test_binwalk.jpg — binwalk + foremost (ZIP appended inside JPEG) ───────
print("\n[3] test_binwalk.jpg  →  binwalk, foremost  (ZIP appended to JPEG)")
make_jpeg(f"{OUT}/_base.jpg")

zip_buf = io.BytesIO()
with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
    zf.writestr("secret.txt", "Hidden file inside image!\nFlag: TEST{binwalk_foremost_works}")
zip_bytes = zip_buf.getvalue()

with open(f"{OUT}/_base.jpg", "rb") as f:
    jpg_bytes = f.read()
with open(f"{OUT}/test_binwalk.jpg", "wb") as f:
    f.write(jpg_bytes + zip_bytes)
os.remove(f"{OUT}/_base.jpg")
print(f"  [OK] {OUT}/test_binwalk.jpg  (ZIP appended after JPEG EOI)")


# ── 4. test_strings.bin — strings module (flag buried in binary noise) ─────────
print("\n[4] test_strings.bin  →  strings  (flag buried in binary noise)")
random.seed(42)
noise  = bytes(random.randint(0, 255) for _ in range(4096))
msg    = b"\x00" * 32 + b"Flag: TEST{strings_module_works_correctly}" + b"\x00" * 32
with open(f"{OUT}/test_strings.bin", "wb") as f:
    f.write(noise[:1024] + msg + noise[1024:])
print(f"  [OK] {OUT}/test_strings.bin")


# ── 5. test_zsteg.png — zsteg (LSB message embedded in red channel) ───────────
print("\n[5] test_zsteg.png  →  zsteg  (LSB message in red channel)")
message = b"Flag: TEST{zsteg_lsb_works}\x00"
pixels  = bytearray(200 * 200 * 3)
for i in range(0, len(pixels), 3):
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 128  # mid-grey base

bit_idx = 0
for byte in message:
    for bit in range(8):
        if bit_idx >= 200 * 200:
            break
        px = bit_idx * 3  # red channel offset
        pixels[px] = (pixels[px] & 0xFE) | ((byte >> (7 - bit)) & 1)
        bit_idx += 1

make_png(200, 200, bytes(pixels), f"{OUT}/test_zsteg.png")


# ── 6. test_steghide.jpg — steghide_crack (password = "password") ─────────────
print("\n[6] test_steghide.jpg  →  steghide + steghide_crack  (password: 'password')")
make_jpeg(f"{OUT}/test_steghide.jpg")
secret = f"{OUT}/_secret.txt"
with open(secret, "w") as f:
    f.write("Flag: TEST{steghide_password_cracked_successfully}")
ok = run([
    "steghide", "embed",
    "-cf", f"{OUT}/test_steghide.jpg",
    "-sf", secret,
    "-p", "password", "-f"
], "steghide embed")
os.remove(secret)
if not ok:
    print("  [WARN] steghide not installed — test_steghide.jpg is a plain JPEG")


# ── 7. test_outguess.jpg — outguess ───────────────────────────────────────────
print("\n[7] test_outguess.jpg  →  outguess")
make_jpeg(f"{OUT}/_og_base.jpg")
secret = f"{OUT}/_og_secret.txt"
with open(secret, "w") as f:
    f.write("Flag: TEST{outguess_module_works}")
ok = run([
    "outguess", "-k", "testkey",
    "-d", secret,
    f"{OUT}/_og_base.jpg",
    f"{OUT}/test_outguess.jpg"
], "outguess embed")
os.remove(secret)
if os.path.exists(f"{OUT}/_og_base.jpg"):
    os.remove(f"{OUT}/_og_base.jpg")
if not ok:
    print("  [INFO] outguess not available — copying plain JPEG for basic outguess test")
    make_jpeg(f"{OUT}/test_outguess.jpg")


# ── summary ────────────────────────────────────────────────────────────────────
print(f"""
{'─' * 60}
All test files saved to: {OUT}
{'─' * 60}

Upload each file to http://localhost:3001 and verify:

  test_basic.png      pngcheck, stegsolve, zsteg, exiftool, binwalk, strings
  test_exif.jpg       exiftool  → flag in EXIF Comment field
  test_binwalk.jpg    binwalk + foremost  → embedded ZIP inside JPEG
  test_strings.bin    strings  → flag in readable text inside binary
  test_zsteg.png      zsteg  → LSB flag in red channel
  test_steghide.jpg   steghide_crack  → password is: password
  test_outguess.jpg   outguess

{'─' * 60}
""")
