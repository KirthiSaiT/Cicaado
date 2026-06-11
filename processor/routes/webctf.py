from flask import Blueprint, request, jsonify
import json
import re
import base64
import hmac
import hashlib
import urllib3
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# Suppress SSL warnings — CTF servers commonly use self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

webctf_bp = Blueprint("webctf", __name__)

# ── Subdomain Finder ──────────────────────────────────────────────────────────

@webctf_bp.route("/subdomains", methods=["POST"])
def find_subdomains():
    """DNS-based subdomain enumeration using concurrent resolution."""
    import dns.resolver as dns_resolver
    data = request.json or {}
    domain = data.get("domain", "").strip().lower()
    if not domain:
        return jsonify({"error": "Domain is required"}), 400

    domain = re.sub(r"^https?://", "", domain).split("/")[0].strip(".")

    wordlist = [
        "www","mail","smtp","pop","imap","webmail","mx","mx1","mx2",
        "ns1","ns2","ns3","dns","dns1","dns2",
        "api","api2","v1","v2","rest","graphql","gateway",
        "dev","staging","stage","test","beta","alpha","demo","sandbox","uat","qa",
        "prod","production","live",
        "admin","portal","dashboard","panel","cpanel","manage","manager",
        "remote","vpn","rdp","citrix",
        "cdn","static","assets","media","img","images","files","upload","downloads",
        "shop","store","blog","forum","wiki","docs","support","help","status",
        "monitor","grafana","kibana","jenkins","ci","build","deploy",
        "git","gitlab","bitbucket","jira","confluence",
        "db","database","mysql","postgres","redis","mongo",
        "app","apps","web","m","mobile","www2","www3",
        "secure","login","auth","sso","id","accounts","account",
        "intranet","internal","corp","office","legacy","old","backup","archive",
        "exchange","autodiscover","owa",
        "cloud","proxy","lb","analytics","stats","reports",
        "payment","pay","billing","partners","client","clients",
    ]

    def resolve(sub):
        fqdn = f"{sub}.{domain}"
        try:
            r = dns_resolver.Resolver()
            r.timeout = 1.5
            r.lifetime = 1.5
            ips = [str(a) for a in r.resolve(fqdn, "A")]
            cname = None
            try:
                cname = str(r.resolve(fqdn, "CNAME")[0])
            except Exception:
                pass
            return {"subdomain": fqdn, "ips": ips, "cname": cname}
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=40) as pool:
        results = list(pool.map(resolve, wordlist))

    found = sorted([r for r in results if r], key=lambda x: x["subdomain"])
    return jsonify({"domain": domain, "checked": len(wordlist), "found": found})

HEADERS = {"User-Agent": "Mozilla/5.0 (CTF-Scanner/1.0)"}


def _get(url, timeout=4, allow_redirects=False):
    """Single GET with SSL verification disabled."""
    return requests.get(
        url, timeout=timeout, allow_redirects=allow_redirects,
        headers=HEADERS, verify=False
    )


def _normalize_url(url):
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url.rstrip("/")


# ── Leak Scanner ──────────────────────────────────────────────────────────────

@webctf_bp.route("/leaks", methods=["POST"])
def check_web_leaks():
    data = request.json or {}
    raw_url = data.get("url", "").strip()
    if not raw_url:
        return jsonify({"error": "URL is required"}), 400

    base = _normalize_url(raw_url)

    paths = [
        "/robots.txt", "/sitemap.xml", "/sitemap_index.xml",
        "/.git/HEAD", "/.git/config", "/.git/COMMIT_EDITMSG",
        "/.env", "/.env.local", "/.env.production", "/.env.backup",
        "/.htaccess", "/web.config",
        "/backup.zip", "/backup.tar.gz", "/backup.sql", "/db.sql",
        "/database.sql", "/dump.sql",
        "/config.php", "/config.json", "/config.yml", "/settings.py",
        "/wp-config.php", "/wp-config.php.bak",
        "/phpinfo.php", "/info.php", "/test.php",
        "/admin", "/administrator", "/admin.php", "/login",
        "/package.json", "/composer.json", "/Dockerfile", "/docker-compose.yml",
        "/swagger.json", "/openapi.json", "/api-docs", "/api/v1", "/api/v2",
        "/.well-known/security.txt", "/security.txt",
        "/crossdomain.xml", "/clientaccesspolicy.xml",
        "/flag.txt", "/flag", "/secret.txt", "/key.txt", "/password.txt",
        "/server-status", "/server-info",
        "/.DS_Store", "/Thumbs.db",
        "/CHANGELOG", "/README", "/README.md", "/LICENSE",
    ]

    def check_path(path):
        try:
            resp = _get(base + path, timeout=4)
            status = resp.status_code
            size = len(resp.content)
            snippet = None
            if status == 200 and size > 0:
                try:
                    snippet = resp.text[:600]
                except Exception:
                    snippet = "[binary content]"
            return path, {"status": status, "size": size,
                          "found": status == 200 and size > 0, "snippet": snippet}
        except Exception as e:
            return path, {"status": None, "found": False, "error": str(e)[:80]}

    results = {}
    with ThreadPoolExecutor(max_workers=15) as pool:
        futures = {pool.submit(check_path, p): p for p in paths}
        for future in as_completed(futures):
            path, result = future.result()
            results[path] = result

    found_count = sum(1 for v in results.values() if v.get("found"))
    return jsonify({"url": base, "scanned": len(paths),
                    "found_count": found_count, "results": results})


# ── Directory Buster ──────────────────────────────────────────────────────────

@webctf_bp.route("/dirbust", methods=["POST"])
def dir_bust():
    data = request.json or {}
    raw_url = data.get("url", "").strip()
    if not raw_url:
        return jsonify({"error": "URL is required"}), 400

    base = _normalize_url(raw_url)

    wordlist = [
        "admin", "login", "dashboard", "panel", "manage", "manager",
        "administrator", "control", "cp", "cpanel",
        "api", "api/v1", "api/v2", "api/v3", "graphql", "rest",
        "upload", "uploads", "files", "file", "static", "assets",
        "images", "img", "css", "js", "media",
        "backup", "bkp", "bak", "old", "archive", "archives",
        "dev", "development", "staging", "test", "testing", "debug",
        "secret", "secrets", "hidden", "private",
        "flag", "flags", "key", "keys", "token",
        "config", "configuration", "settings", "setup",
        "user", "users", "account", "accounts", "profile",
        "docs", "doc", "documentation", "swagger", "openapi",
        "source", "src", "code",
        "shell", "cmd", "exec", "execute", "run",
        "cgi-bin", "scripts",
        "phpmyadmin", "mysql", "db", "database",
        "wp-admin", "wp-login.php", "wp-content",
        ".git", ".svn", ".hg",
        "index.php", "index.html", "default.php",
        "phpinfo.php", "info.php", "test.php", "config.php",
        "flag.txt", "secret.txt", "readme.txt", "changelog.txt",
        "robots.txt", "sitemap.xml",
        "server-status", "server-info",
    ]

    def check_word(word):
        full = base + "/" + word
        try:
            resp = _get(full, timeout=3)
            if resp.status_code not in (404, 400, 410):
                return {
                    "path": "/" + word,
                    "url": full,
                    "status": resp.status_code,
                    "size": len(resp.content),
                    "redirect": resp.headers.get("Location", "")
                                if resp.status_code in (301, 302, 303, 307, 308) else "",
                }
        except Exception:
            pass
        return None

    found = []
    with ThreadPoolExecutor(max_workers=20) as pool:
        for result in pool.map(check_word, wordlist):
            if result:
                found.append(result)

    # Sort by status code
    found.sort(key=lambda x: x["status"])
    return jsonify({"url": base, "scanned": len(wordlist), "found": found})


# ── HTTP Headers ──────────────────────────────────────────────────────────────

@webctf_bp.route("/headers", methods=["POST"])
def check_headers():
    data = request.json or {}
    raw_url = data.get("url", "").strip()
    if not raw_url:
        return jsonify({"error": "URL is required"}), 400

    url = _normalize_url(raw_url)
    try:
        resp = requests.get(url, timeout=10, allow_redirects=True,
                            headers=HEADERS, verify=False)
    except Exception as e:
        return jsonify({"error": f"Request failed: {str(e)}"}), 500

    headers = dict(resp.headers)

    flag_patterns = [r"[a-zA-Z0-9_]+\{[^}]+\}", r"flag", r"ctf", r"secret", r"token"]
    interesting = {}
    for k, v in headers.items():
        for pat in flag_patterns:
            if re.search(pat, v, re.IGNORECASE):
                interesting[k] = v
                break

    security_headers = [
        "Content-Security-Policy", "X-Frame-Options", "X-XSS-Protection",
        "Strict-Transport-Security", "X-Content-Type-Options",
        "Referrer-Policy", "Permissions-Policy",
    ]
    missing_security = [h for h in security_headers
                        if h.lower() not in {k.lower() for k in headers}]

    return jsonify({
        "url": resp.url,
        "status_code": resp.status_code,
        "headers": headers,
        "interesting": interesting,
        "missing_security_headers": missing_security,
        "redirect_chain": [{"url": r.url, "status": r.status_code} for r in resp.history],
        "server": headers.get("Server", ""),
        "powered_by": headers.get("X-Powered-By", ""),
    })


# ── Cookie Analyzer ───────────────────────────────────────────────────────────

@webctf_bp.route("/cookies", methods=["POST"])
def analyze_cookies():
    data = request.json or {}
    raw_url = data.get("url", "").strip()
    raw_cookies = data.get("cookies", "").strip()

    if not raw_url and not raw_cookies:
        return jsonify({"error": "Provide a URL or a cookie string"}), 400

    analyzed = {}

    if raw_url:
        url = _normalize_url(raw_url)
        try:
            resp = requests.get(url, timeout=10, headers=HEADERS, verify=False)
            for c in resp.cookies:
                analyzed[c.name] = {
                    "value": c.value,
                    "domain": c.domain,
                    "path": c.path,
                    "secure": c.secure,
                    "decoded": _try_decode_value(c.value),
                }
        except Exception as e:
            return jsonify({"error": f"Cookie fetch failed: {str(e)}"}), 500

    if raw_cookies:
        for part in raw_cookies.split(";"):
            part = part.strip()
            if "=" in part:
                k, v = part.split("=", 1)
                analyzed[k.strip()] = {
                    "value": v.strip(),
                    "decoded": _try_decode_value(v.strip()),
                }

    return jsonify({"cookies": analyzed})


def _try_decode_value(value):
    from urllib.parse import unquote
    decodings = {}

    # Base64
    try:
        padded = value + "=" * (4 - len(value) % 4)
        decoded = base64.b64decode(padded).decode("utf-8")
        if decoded.isprintable() and decoded != value and len(decoded) > 2:
            decodings["base64"] = decoded
    except Exception:
        pass

    # URL decode
    try:
        decoded = unquote(value)
        if decoded != value:
            decodings["url_decoded"] = decoded
    except Exception:
        pass

    # Flask session cookie (starts with a dot)
    if value.startswith("."):
        try:
            payload_b64 = value.lstrip(".").split(".")[0]
            padded = payload_b64 + "=" * (4 - len(payload_b64) % 4)
            raw = base64.urlsafe_b64decode(padded).decode("utf-8")
            decodings["flask_session"] = json.loads(raw)
        except Exception:
            pass

    # JWT
    if value.count(".") == 2:
        try:
            _, payload_b64, _ = value.split(".")
            padded = payload_b64 + "=" * (4 - len(payload_b64) % 4)
            payload = base64.urlsafe_b64decode(padded).decode("utf-8")
            decodings["jwt_payload"] = json.loads(payload)
        except Exception:
            pass

    # Hex
    try:
        if re.fullmatch(r"[0-9a-fA-F]+", value) and len(value) % 2 == 0 and len(value) >= 8:
            decoded = bytes.fromhex(value).decode("utf-8")
            if decoded.isprintable():
                decodings["hex_decoded"] = decoded
    except Exception:
        pass

    return decodings if decodings else None


# ── JWT Decoder / Cracker ─────────────────────────────────────────────────────

@webctf_bp.route("/jwt", methods=["POST"])
def jwt_tools():
    data = request.json or {}
    token = data.get("token", "").strip()
    do_crack = data.get("crack", False)

    if not token:
        return jsonify({"error": "JWT token is required"}), 400

    parts = token.split(".")
    if len(parts) != 3:
        return jsonify({"error": "Invalid JWT: expected 3 dot-separated parts"}), 400

    def b64decode(s):
        s = s + "=" * (4 - len(s) % 4)
        return base64.urlsafe_b64decode(s).decode("utf-8")

    try:
        header = json.loads(b64decode(parts[0]))
        payload = json.loads(b64decode(parts[1]))
    except Exception as e:
        return jsonify({"error": f"Failed to decode JWT: {str(e)}"}), 400

    result = {
        "header": header,
        "payload": payload,
        "signature": parts[2],
        "algorithm": header.get("alg", "unknown"),
        "cracked_secret": None,
        "crack_attempted": False,
        "none_attack_token": (
            base64.urlsafe_b64encode(
                json.dumps({"alg": "none", "typ": "JWT"}).encode()
            ).rstrip(b"=").decode() + "." + parts[1] + "."
        ),
    }

    if do_crack and header.get("alg", "").startswith("HS"):
        hash_fn = {
            "HS256": hashlib.sha256,
            "HS384": hashlib.sha384,
            "HS512": hashlib.sha512,
        }.get(header["alg"], hashlib.sha256)

        header_payload = parts[0] + "." + parts[1]
        common_secrets = [
            "", "secret", "password", "123456", "admin", "key",
            "your-256-bit-secret", "supersecret", "jwt_secret", "jwtsecret",
            "mysecret", "changeme", "development", "test", "prod",
            "production", "staging", "flask", "django", "express", "laravel",
            "node", "api_key", "api_secret", "token", "jwt", "hs256",
            "hmac", "secret_key", "private_key", "access_secret",
            "app_secret", "auth_secret", "signing_key", "s3cr3t",
            "p@ssword", "P@ssword", "P@ssw0rd", "qwerty", "letmein",
            "1234567890", "abcdefgh", "hello", "world", "root", "toor",
        ]

        result["crack_attempted"] = True
        for s in common_secrets:
            sig = base64.urlsafe_b64encode(
                hmac.new(s.encode(), header_payload.encode(), hash_fn).digest()
            ).rstrip(b"=").decode()
            if sig == parts[2]:
                result["cracked_secret"] = s
                break

    return jsonify(result)


# ── Wayback Machine ───────────────────────────────────────────────────────────

@webctf_bp.route("/wayback", methods=["POST"])
def wayback_lookup():
    data = request.json or {}
    raw_url = data.get("url", "").strip()
    if not raw_url:
        return jsonify({"error": "URL is required"}), 400

    if not raw_url.startswith(("http://", "https://")):
        raw_url = "https://" + raw_url

    try:
        avail = requests.get(
            f"https://archive.org/wayback/available?url={raw_url}",
            timeout=10
        ).json()

        cdx = requests.get(
            f"https://web.archive.org/cdx/search/cdx"
            f"?url={raw_url}&output=json&limit=30"
            f"&fl=timestamp,statuscode,mimetype,original&collapse=timestamp:8",
            timeout=15
        )
        snapshots = cdx.json() if cdx.ok else []

        return jsonify({"url": raw_url, "availability": avail, "snapshots": snapshots})
    except Exception as e:
        return jsonify({"error": f"Wayback lookup failed: {str(e)}"}), 500
