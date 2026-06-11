"use client";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeakResult = {
  url: string;
  scanned: number;
  found_count: number;
  results: Record<string, { status: number | null; size: number; found: boolean; snippet?: string | null; error?: string }>;
};

type DirbustResult = {
  url: string;
  scanned: number;
  found: Array<{ path: string; url: string; status: number; size: number; redirect?: string }>;
};

type HeaderResult = {
  url: string;
  status_code: number;
  headers: Record<string, string>;
  interesting: Record<string, string>;
  missing_security_headers: string[];
  redirect_chain: Array<{ url: string; status: number }>;
  server: string;
  powered_by: string;
};

type CookieResult = {
  cookies: Record<string, {
    value: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    decoded?: Record<string, unknown> | null;
  }>;
};

type JwtResult = {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  algorithm: string;
  cracked_secret?: string | null;
  crack_attempted?: boolean;
  none_attack_token?: string;
};

type WaybackResult = {
  url: string;
  availability: { archived_snapshots?: { closest?: { available: boolean; url: string; timestamp: string; status: string } } };
  snapshots: Array<string[]>;
};

type ToolResult = LeakResult | DirbustResult | HeaderResult | CookieResult | JwtResult | WaybackResult | { error: string };

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: "leaks",
    label: "Web Leak Scanner",
    icon: "🔍",
    desc: "Scan for robots.txt, .git, .env, backups, API docs, and 30+ common leaks",
    input: "url",
  },
  {
    id: "dirbust",
    label: "Directory Buster",
    icon: "📂",
    desc: "Brute-force common paths and files — find hidden admin panels, backups, flags",
    input: "url",
  },
  {
    id: "headers",
    label: "HTTP Headers",
    icon: "📋",
    desc: "Fetch and analyze response headers. Highlights flags and misconfigured security headers",
    input: "url",
  },
  {
    id: "cookies",
    label: "Cookie Analyzer",
    icon: "🍪",
    desc: "Fetch cookies from a URL or paste a raw cookie string to decode base64, JWT, Flask sessions",
    input: "url_and_cookie",
  },
  {
    id: "jwt",
    label: "JWT Decoder",
    icon: "🔑",
    desc: "Decode JWT header + payload. Optionally brute-force common HS256 secrets",
    input: "jwt",
  },
  {
    id: "wayback",
    label: "Wayback Machine",
    icon: "🕰️",
    desc: "Find archived snapshots of a page — deleted flags or source code often visible",
    input: "url",
  },
] as const;

type ToolId = typeof TOOLS[number]["id"];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ code }: { code: number | null }) {
  if (code === null) return <span className="text-zinc-500 text-xs">ERR</span>;
  const color = code < 300 ? "text-green-400" : code < 400 ? "text-yellow-400" : code < 500 ? "text-red-400" : "text-red-600";
  return <span className={`font-mono text-xs font-bold ${color}`}>{code}</span>;
}

// ─── Result renderers ─────────────────────────────────────────────────────────

function LeaksView({ data }: { data: LeakResult }) {
  const found = Object.entries(data.results).filter(([, v]) => v.found);
  const not_found = Object.entries(data.results).filter(([, v]) => !v.found);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 text-sm">
        <span className="text-zinc-400">Scanned: <b className="text-white">{data.scanned}</b></span>
        <span className="text-green-400">Found: <b>{data.found_count}</b></span>
        <span className="text-zinc-500 text-xs truncate">{data.url}</span>
      </div>

      {found.length > 0 && (
        <div>
          <h4 className="text-green-400 font-bold uppercase tracking-wider text-xs mb-3">Found ({found.length})</h4>
          <div className="space-y-3">
            {found.map(([path, info]) => (
              <div key={path} className="bg-green-900/10 border border-green-700/40 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-green-300 text-sm">{path}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 text-xs">{info.size} bytes</span>
                    <StatusBadge code={info.status} />
                  </div>
                </div>
                {info.snippet && (
                  <pre className="text-zinc-300 text-xs bg-black/60 rounded p-3 overflow-auto max-h-32 whitespace-pre-wrap">{info.snippet}</pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {found.length === 0 && (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-400 text-sm">
          No leaks detected across {data.scanned} paths.
        </div>
      )}

      <details className="cursor-pointer">
        <summary className="text-zinc-500 text-xs hover:text-zinc-300 select-none">Not found ({not_found.length} paths)</summary>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1">
          {not_found.map(([path, info]) => (
            <div key={path} className="flex items-center gap-2 text-xs text-zinc-600">
              <StatusBadge code={info.status} />
              <span className="font-mono truncate">{path}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function DirbustView({ data }: { data: DirbustResult }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span className="text-zinc-400">Scanned: <b className="text-white">{data.scanned}</b> paths</span>
        <span className="text-green-400">Found: <b>{data.found.length}</b></span>
      </div>
      {data.found.length > 0 ? (
        <div className="space-y-2">
          {data.found.map((item) => (
            <div key={item.path} className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <StatusBadge code={item.status} />
                <span className="font-mono text-lime-300 text-sm truncate">{item.path}</span>
                {item.redirect && <span className="text-zinc-500 text-xs truncate">→ {item.redirect}</span>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-zinc-500 text-xs">{item.size}B</span>
                <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300">↗</a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-400 text-sm">
          No interesting paths found across {data.scanned} attempts.
        </div>
      )}
    </div>
  );
}

function HeadersView({ data }: { data: HeaderResult }) {
  return (
    <div className="space-y-5">
      <div className="flex gap-4 flex-wrap text-sm">
        <span className="text-zinc-400">Status: <StatusBadge code={data.status_code} /></span>
        {data.server && <span className="text-zinc-400">Server: <b className="text-white">{data.server}</b></span>}
        {data.powered_by && <span className="text-zinc-400">Powered-By: <b className="text-yellow-300">{data.powered_by}</b></span>}
      </div>

      {Object.keys(data.interesting).length > 0 && (
        <div>
          <h4 className="text-yellow-400 font-bold uppercase tracking-wider text-xs mb-2">🚩 Interesting Headers</h4>
          <div className="space-y-2">
            {Object.entries(data.interesting).map(([k, v]) => (
              <div key={k} className="bg-yellow-900/20 border border-yellow-700/40 rounded p-3">
                <span className="text-yellow-300 font-mono text-sm font-bold">{k}: </span>
                <span className="text-green-300 font-mono text-sm select-all">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.missing_security_headers.length > 0 && (
        <div>
          <h4 className="text-red-400 font-bold uppercase tracking-wider text-xs mb-2">Missing Security Headers</h4>
          <div className="flex flex-wrap gap-2">
            {data.missing_security_headers.map((h) => (
              <span key={h} className="px-2 py-1 bg-red-900/20 border border-red-700/30 text-red-300 text-xs font-mono rounded">{h}</span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-zinc-400 font-bold uppercase tracking-wider text-xs mb-2">All Headers</h4>
        <div className="bg-black/60 rounded-lg p-4 space-y-1 max-h-80 overflow-auto">
          {Object.entries(data.headers).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-xs">
              <span className="text-cyan-400 font-mono shrink-0 w-48 truncate">{k}</span>
              <span className="text-zinc-300 font-mono break-all">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {data.redirect_chain.length > 0 && (
        <div>
          <h4 className="text-zinc-400 font-bold uppercase tracking-wider text-xs mb-2">Redirect Chain</h4>
          {data.redirect_chain.map((r, i) => (
            <div key={i} className="text-xs text-zinc-400 font-mono">
              <StatusBadge code={r.status} /> <span>{r.url}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CookiesView({ data }: { data: CookieResult }) {
  const entries = Object.entries(data.cookies);
  if (entries.length === 0) {
    return <div className="text-zinc-400 text-sm p-4 bg-zinc-900 border border-zinc-700 rounded-lg">No cookies found.</div>;
  }
  return (
    <div className="space-y-4">
      {entries.map(([name, info]) => (
        <div key={name} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-lime-300 font-bold">{name}</span>
            <div className="flex gap-2 text-xs">
              {info.secure && <span className="px-2 py-0.5 bg-green-900/30 border border-green-700/30 text-green-400 rounded">Secure</span>}
              {info.domain && <span className="text-zinc-500">{info.domain}</span>}
            </div>
          </div>
          <pre className="text-zinc-300 text-xs bg-black/60 rounded p-3 whitespace-pre-wrap break-all select-all mb-2">{info.value}</pre>
          {info.decoded && Object.keys(info.decoded).length > 0 && (
            <div className="space-y-2">
              {Object.entries(info.decoded).map(([method, val]) => (
                <div key={method} className="bg-green-900/10 border border-green-700/30 rounded p-3">
                  <span className="text-green-400 text-xs font-bold uppercase">{method}</span>
                  <pre className="text-green-300 text-xs mt-1 whitespace-pre-wrap break-all select-all">
                    {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function JwtView({ data }: { data: JwtResult }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <span className="px-2 py-1 bg-zinc-800 text-cyan-300 font-mono text-xs rounded border border-zinc-700">alg: {data.algorithm}</span>
        {data.crack_attempted && (
          data.cracked_secret !== null && data.cracked_secret !== undefined
            ? <span className="px-2 py-1 bg-green-900/40 text-green-300 font-mono text-xs rounded border border-green-700">secret: &quot;{data.cracked_secret}&quot;</span>
            : <span className="px-2 py-1 bg-amber-900/30 text-amber-300 text-xs rounded border border-amber-700/40">Secret not in common list</span>
        )}
      </div>

      <div>
        <h4 className="text-cyan-400 font-bold text-xs uppercase mb-2">Header</h4>
        <pre className="text-cyan-200 text-sm bg-black/60 rounded p-4 select-all">{JSON.stringify(data.header, null, 2)}</pre>
      </div>

      <div>
        <h4 className="text-lime-400 font-bold text-xs uppercase mb-2">Payload</h4>
        <pre className="text-lime-200 text-sm bg-black/60 rounded p-4 select-all">{JSON.stringify(data.payload, null, 2)}</pre>
      </div>

      <div>
        <h4 className="text-zinc-400 font-bold text-xs uppercase mb-2">Signature</h4>
        <pre className="text-zinc-300 text-xs bg-black/60 rounded p-3 break-all select-all">{data.signature}</pre>
      </div>

      {data.none_attack_token && (
        <div>
          <h4 className="text-red-400 font-bold text-xs uppercase mb-2">None Algorithm Attack Token</h4>
          <pre className="text-red-200 text-xs bg-black/60 rounded p-3 break-all select-all">{data.none_attack_token}</pre>
          <p className="text-zinc-500 text-xs mt-1">Replace original token with this to test for &quot;none&quot; algorithm vulnerability.</p>
        </div>
      )}
    </div>
  );
}

function WaybackView({ data }: { data: WaybackResult }) {
  const closest = data.availability?.archived_snapshots?.closest;
  const snapshots = data.snapshots.slice(1); // skip header row

  return (
    <div className="space-y-5">
      {closest?.available ? (
        <div className="p-4 bg-green-900/20 border border-green-700/40 rounded-lg">
          <h4 className="text-green-400 font-bold mb-2">Latest Snapshot Available</h4>
          <p className="text-zinc-300 text-sm">Timestamp: <span className="font-mono text-white">{closest.timestamp}</span></p>
          <a href={closest.url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-blue-400 hover:text-blue-300 text-sm underline break-all">
            {closest.url}
          </a>
        </div>
      ) : (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-400 text-sm">
          No archived snapshot found for this URL.
        </div>
      )}

      {snapshots.length > 0 && (
        <div>
          <h4 className="text-zinc-400 font-bold text-xs uppercase mb-2">Snapshot History ({snapshots.length})</h4>
          <div className="bg-black/60 rounded-lg overflow-auto max-h-80">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left p-2 text-zinc-500 font-mono">Timestamp</th>
                  <th className="text-left p-2 text-zinc-500 font-mono">Status</th>
                  <th className="text-left p-2 text-zinc-500 font-mono">Type</th>
                  <th className="text-left p-2 text-zinc-500 font-mono">Link</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-900/40">
                    <td className="p-2 font-mono text-zinc-300">{row[0]}</td>
                    <td className="p-2"><StatusBadge code={parseInt(row[1]) || null} /></td>
                    <td className="p-2 text-zinc-500 truncate max-w-24">{row[2]}</td>
                    <td className="p-2">
                      <a
                        href={`https://web.archive.org/web/${row[0]}/${row[3]}`}
                        target="_blank" rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >↗</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WebCTF() {
  const [selectedTool, setSelectedTool] = useState<ToolId>("leaks");
  const [url, setUrl] = useState("");
  const [jwtToken, setJwtToken] = useState("");
  const [cookieStr, setCookieStr] = useState("");
  const [crackJwt, setCrackJwt] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTool = TOOLS.find((t) => t.id === selectedTool)!;

  const runTool = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    const body: Record<string, unknown> = { tool: selectedTool };
    if (activeTool.input === "jwt") {
      body.token = jwtToken;
      body.crack = crackJwt;
    } else if (activeTool.input === "url_and_cookie") {
      if (url) body.url = url;
      if (cookieStr) body.cookies = cookieStr;
    } else {
      body.url = url;
    }

    try {
      const res = await fetch("/api/webctf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
      } else {
        setResult(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="relative overflow-hidden pt-8 pb-10 px-4 border-b border-zinc-800/50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-blue-500/4 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <h1 className="text-4xl font-bold mb-2">Web CTF Tools</h1>
          <p className="text-zinc-400">Directory busting, JWT cracking, header hunting, leak scanning — common web challenge tools.</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0 space-y-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => { setSelectedTool(tool.id); setResult(null); setError(null); }}
              className={`w-full text-left px-3 py-3 rounded-lg transition-all text-sm ${
                selectedTool === tool.id
                  ? "bg-lime-500/10 border border-lime-500/40 text-lime-300"
                  : "border border-transparent text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <span className="mr-2">{tool.icon}</span>
              {tool.label}
            </button>
          ))}
        </div>

        {/* Main panel */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Tool header */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
            <h2 className="text-white font-bold text-lg mb-1">{activeTool.icon} {activeTool.label}</h2>
            <p className="text-zinc-400 text-sm mb-4">{activeTool.desc}</p>

            {/* Input section */}
            <div className="space-y-3">
              {activeTool.input === "jwt" ? (
                <>
                  <textarea
                    value={jwtToken}
                    onChange={(e) => setJwtToken(e.target.value)}
                    placeholder="Paste JWT token here (eyJ...)"
                    className="w-full bg-black/60 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500/50 resize-none h-24"
                  />
                  <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={crackJwt}
                      onChange={(e) => setCrackJwt(e.target.checked)}
                      className="accent-lime-500"
                    />
                    Try to crack HS256 secret (common passwords)
                  </label>
                </>
              ) : activeTool.input === "url_and_cookie" ? (
                <>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runTool()}
                    placeholder="https://target.com (optional — fetches live cookies)"
                    className="w-full bg-black/60 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500/50"
                  />
                  <textarea
                    value={cookieStr}
                    onChange={(e) => setCookieStr(e.target.value)}
                    placeholder="Or paste raw cookie string: session=abc123; token=xyz"
                    className="w-full bg-black/60 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500/50 resize-none h-20"
                  />
                </>
              ) : (
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runTool()}
                  placeholder="https://challenge.ctf.com"
                  className="w-full bg-black/60 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-lime-500/50"
                />
              )}

              <button
                onClick={runTool}
                disabled={isLoading || (activeTool.input === "jwt" ? !jwtToken.trim() : !url.trim() && !cookieStr.trim())}
                className="w-full bg-gradient-to-r from-green-500 to-lime-600 hover:from-green-600 hover:to-lime-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
                    Running {activeTool.label}...
                  </span>
                ) : `Run ${activeTool.label}`}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {result && !("error" in result) && (
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <h3 className="text-lime-400 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse inline-block" />
                Results — {activeTool.label}
              </h3>

              {selectedTool === "leaks"    && <LeaksView   data={result as LeakResult}    />}
              {selectedTool === "dirbust"  && <DirbustView data={result as DirbustResult} />}
              {selectedTool === "headers"  && <HeadersView data={result as HeaderResult}  />}
              {selectedTool === "cookies"  && <CookiesView data={result as CookieResult}  />}
              {selectedTool === "jwt"      && <JwtView     data={result as JwtResult}     />}
              {selectedTool === "wayback"  && <WaybackView data={result as WaybackResult} />}
            </div>
          )}

          {result && "error" in result && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm">
              {result.error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
