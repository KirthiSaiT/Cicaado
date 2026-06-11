"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Server, Shield, Globe, FileSearch,
  Code, Database, AlertTriangle, Network, Lock, Archive,
  Cookie, Key, Clock, ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeakEntry { status: number | null; size: number; found: boolean; snippet?: string | null; error?: string }
interface LeaksResult  { url: string; scanned: number; found_count: number; results: Record<string, LeakEntry> }
interface DirEntry     { path: string; url: string; status: number; size: number; redirect?: string }
interface DirbustResult { url: string; scanned: number; found: DirEntry[] }
interface HeadersResult {
  url: string; status_code: number;
  headers: Record<string, string>;
  interesting: Record<string, string>;
  missing_security_headers: string[];
  redirect_chain: Array<{ url: string; status: number }>;
  server: string; powered_by: string;
}
interface CookieInfo    { value: string; domain?: string; secure?: boolean; decoded?: Record<string, unknown> | null }
interface CookiesResult { cookies: Record<string, CookieInfo> }
interface JwtResult {
  header: Record<string, unknown>; payload: Record<string, unknown>;
  signature: string; algorithm: string;
  cracked_secret?: string | null; crack_attempted?: boolean; none_attack_token?: string;
}
interface WaybackResult {
  url: string;
  availability: { archived_snapshots?: { closest?: { available: boolean; url: string; timestamp: string } } };
  snapshots: string[][];
}
interface SubdomainEntry { subdomain: string; ips: string[]; cname?: string | null }
interface SubdomainsResult { domain: string; checked: number; found: SubdomainEntry[] }

// ─── Tool definitions ─────────────────────────────────────────────────────────

type InputKind = "domain" | "url" | "url_and_cookie" | "jwt" | "domain_probe";
type ToolGroup = "osint" | "probe";

interface Tool {
  id: string; name: string; icon: React.ElementType;
  desc: string; group: ToolGroup; inputKind: InputKind;
}

const TOOLS: Tool[] = [
  { id: "whois_domain", name: "Whois",            icon: Globe,         desc: "Registrar, dates, nameservers and registrant info",        group: "osint",  inputKind: "domain"       },
  { id: "dns_deep",     name: "DNS Records",       icon: Server,        desc: "Full DNS — A, MX, NS, TXT, CNAME, SOA, SPF",              group: "osint",  inputKind: "domain"       },
  { id: "subdomain",    name: "Subdomains (recon)",icon: Network,       desc: "Enumerate subdomains via recon modules",                   group: "osint",  inputKind: "domain"       },
  { id: "headers",      name: "HTTP Headers",      icon: Code,          desc: "Server response headers — tech stack fingerprinting",     group: "osint",  inputKind: "domain"       },
  { id: "ssl_tls",      name: "SSL / TLS",         icon: Lock,          desc: "Certificate chain, expiry, cipher suites",                group: "osint",  inputKind: "domain"       },
  { id: "cors",         name: "CORS",              icon: AlertTriangle, desc: "Detect lax Cross-Origin policies",                        group: "osint",  inputKind: "domain"       },
  { id: "bucket",       name: "S3 Buckets",        icon: Database,      desc: "Search for exposed cloud storage buckets",                group: "osint",  inputKind: "domain"       },
  { id: "sensitive",    name: "Sensitive Files",   icon: FileSearch,    desc: "Check for exposed .env, .git, config files",              group: "osint",  inputKind: "domain"       },
  { id: "waf",          name: "WAF Detection",     icon: Shield,        desc: "Identify Web Application Firewalls",                      group: "osint",  inputKind: "domain"       },
  { id: "emailscrap",   name: "Email Scraper",     icon: Search,        desc: "Harvest email addresses from the domain",                 group: "osint",  inputKind: "domain"       },
  { id: "subdomains",   name: "Subdomain Finder",  icon: Network,       desc: "DNS-based enumeration — resolves 70+ common prefixes",    group: "probe",  inputKind: "domain_probe" },
  { id: "leaks",        name: "Leak Scanner",      icon: FileSearch,    desc: "Concurrently checks 35+ paths — robots.txt, .git, .env, backups", group: "probe", inputKind: "url" },
  { id: "dirbust",      name: "Dir Buster",        icon: Search,        desc: "Brute-forces 60+ common paths for hidden endpoints",      group: "probe",  inputKind: "url"          },
  { id: "ctf_headers",  name: "Header Analyzer",   icon: Code,          desc: "Deep header analysis — flags, misconfigs, redirect chain", group: "probe", inputKind: "url"          },
  { id: "cookies",      name: "Cookie Decoder",    icon: Cookie,        desc: "Decode base64, Flask sessions, JWTs from live URL or raw string", group: "probe", inputKind: "url_and_cookie" },
  { id: "jwt",          name: "JWT Analyzer",      icon: Key,           desc: "Decode JWT, generate none-alg token, crack HS256 secrets", group: "probe", inputKind: "jwt"          },
  { id: "wayback",      name: "Wayback Machine",   icon: Clock,         desc: "Find archived versions — deleted pages, old source code", group: "probe",  inputKind: "url"          },
];

// ─── API ──────────────────────────────────────────────────────────────────────

async function runOsint(toolId: string, domain: string): Promise<unknown> {
  const res = await fetch("/api/recon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ module_name: toolId, domain: domain.trim(), deep: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Scan failed");
  return data[toolId];
}

async function runProbe(toolId: string, params: Record<string, unknown>): Promise<unknown> {
  const endpoint = toolId === "ctf_headers" ? "headers" : toolId;
  const res = await fetch("/api/webctf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: endpoint, ...params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Tool failed");
  return data;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function StatusPill({ code }: { code: number | null }) {
  if (code === null) return <span className="text-zinc-500 text-xs font-mono">ERR</span>;
  const color = code < 300 ? "text-green-400" : code < 400 ? "text-yellow-400" : "text-red-400";
  return <span className={`font-mono text-xs font-bold ${color}`}>{code}</span>;
}

// ─── Result renderers ─────────────────────────────────────────────────────────

function LeaksView({ data }: { data: LeaksResult }) {
  const found   = Object.entries(data.results).filter(([, v]) => v.found);
  const missing = Object.entries(data.results).filter(([, v]) => !v.found);
  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs font-mono">
        <span className="text-zinc-400">scanned <b className="text-white">{data.scanned}</b></span>
        <span className="text-lime-400">found <b>{data.found_count}</b></span>
      </div>
      {found.length > 0 ? found.map(([path, info]) => (
        <div key={path} className="bg-lime-950/20 border border-lime-800/30 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-lime-300 text-sm">{path}</span>
            <div className="flex gap-3 items-center">
              <span className="text-zinc-500 text-xs">{info.size}B</span>
              <StatusPill code={info.status} />
            </div>
          </div>
          {info.snippet && <pre className="text-zinc-300 text-xs bg-black/40 rounded-lg p-3 max-h-32 overflow-auto whitespace-pre-wrap">{info.snippet}</pre>}
        </div>
      )) : <p className="text-zinc-500 text-sm font-mono">No exposed paths found.</p>}
      {missing.length > 0 && (
        <details className="cursor-pointer">
          <summary className="text-zinc-600 text-xs font-mono select-none hover:text-zinc-400">
            {missing.length} paths checked — not exposed
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {missing.map(([path, info]) => (
              <div key={path} className="flex items-center gap-2 text-xs text-zinc-700 font-mono">
                <StatusPill code={info.status} /><span className="truncate">{path}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function DirbustView({ data }: { data: DirbustResult }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-mono text-zinc-400">
        scanned <b className="text-white">{data.scanned}</b> · found <b className="text-lime-400">{data.found.length}</b>
      </p>
      {data.found.length > 0 ? data.found.map(item => (
        <div key={item.path} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 gap-4 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <StatusPill code={item.status} />
            <span className="font-mono text-lime-300 text-sm truncate">{item.path}</span>
            {item.redirect && <span className="text-zinc-500 text-xs truncate">→ {item.redirect}</span>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-zinc-500 text-xs">{item.size}B</span>
            <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:text-blue-300">↗</a>
          </div>
        </div>
      )) : <p className="text-zinc-500 text-sm font-mono">Nothing interesting found.</p>}
    </div>
  );
}

function HeadersView({ data }: { data: HeadersResult }) {
  return (
    <div className="space-y-5">
      <div className="flex gap-4 flex-wrap text-xs font-mono">
        <span className="text-zinc-400">status <StatusPill code={data.status_code} /></span>
        {data.server && <span className="text-zinc-400">server <b className="text-white">{data.server}</b></span>}
        {data.powered_by && <span className="text-zinc-400">x-powered-by <b className="text-yellow-300">{data.powered_by}</b></span>}
      </div>
      {Object.keys(data.interesting).length > 0 && (
        <div>
          <p className="text-xs font-mono text-yellow-400 mb-2 uppercase tracking-wider">Interesting values</p>
          {Object.entries(data.interesting).map(([k, v]) => (
            <div key={k} className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-3 mb-2">
              <span className="text-yellow-300 font-mono text-xs font-bold">{k}: </span>
              <span className="text-lime-300 font-mono text-xs select-all">{v}</span>
            </div>
          ))}
        </div>
      )}
      {data.missing_security_headers.length > 0 && (
        <div>
          <p className="text-xs font-mono text-red-400 mb-2 uppercase tracking-wider">Missing security headers</p>
          <div className="flex flex-wrap gap-2">
            {data.missing_security_headers.map(h => (
              <span key={h} className="px-2 py-0.5 bg-red-950/30 border border-red-800/30 text-red-300 text-xs font-mono rounded-lg">{h}</span>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-mono text-zinc-500 mb-2 uppercase tracking-wider">All headers</p>
        <div className="bg-black/40 rounded-xl p-4 space-y-1 max-h-64 overflow-auto border border-zinc-800">
          {Object.entries(data.headers).map(([k, v]) => (
            <div key={k} className="flex gap-3 text-xs font-mono">
              <span className="text-cyan-400 shrink-0 w-44 truncate">{k}</span>
              <span className="text-zinc-300 break-all">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CookiesView({ data }: { data: CookiesResult }) {
  const entries = Object.entries(data.cookies);
  if (!entries.length) return <p className="text-zinc-500 text-sm font-mono">No cookies found.</p>;
  return (
    <div className="space-y-4">
      {entries.map(([name, info]) => (
        <div key={name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <span className="font-mono text-lime-300 font-bold text-sm">{name}</span>
          <pre className="text-zinc-400 text-xs bg-black/40 rounded-lg p-3 mt-2 whitespace-pre-wrap break-all select-all">{info.value}</pre>
          {info.decoded && Object.keys(info.decoded).length > 0 && (
            <div className="mt-3 space-y-2">
              {Object.entries(info.decoded).map(([method, val]) => (
                <div key={method} className="bg-lime-950/20 border border-lime-800/30 rounded-lg p-3">
                  <span className="text-lime-400 text-xs font-bold font-mono uppercase tracking-wider">{method}</span>
                  <pre className="text-lime-200 text-xs mt-1 whitespace-pre-wrap break-all select-all">
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
      <div className="flex gap-2 flex-wrap items-center">
        <span className="px-2 py-1 bg-zinc-800 text-cyan-300 font-mono text-xs rounded-lg border border-zinc-700">alg: {data.algorithm}</span>
        {data.crack_attempted && (
          data.cracked_secret != null
            ? <span className="px-2 py-1 bg-lime-950/40 text-lime-300 font-mono text-xs rounded-lg border border-lime-800/40">secret: &quot;{data.cracked_secret}&quot;</span>
            : <span className="px-2 py-1 bg-amber-950/30 text-amber-300 text-xs font-mono rounded-lg border border-amber-800/30">secret not in common list</span>
        )}
      </div>
      <div>
        <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">Header</p>
        <pre className="text-cyan-200 text-sm bg-black/40 rounded-xl p-4 select-all border border-zinc-800">{JSON.stringify(data.header, null, 2)}</pre>
      </div>
      <div>
        <p className="text-xs font-mono text-lime-400 uppercase tracking-wider mb-2">Payload</p>
        <pre className="text-lime-200 text-sm bg-black/40 rounded-xl p-4 select-all border border-zinc-800">{JSON.stringify(data.payload, null, 2)}</pre>
      </div>
      {data.none_attack_token && (
        <div>
          <p className="text-xs font-mono text-red-400 uppercase tracking-wider mb-2">None-algorithm attack token</p>
          <pre className="text-red-200 text-xs bg-black/40 rounded-xl p-3 break-all select-all border border-zinc-800">{data.none_attack_token}</pre>
          <p className="text-zinc-500 text-xs mt-1 font-mono">Replace original token with this to test for none-alg vulnerability.</p>
        </div>
      )}
    </div>
  );
}

function WaybackView({ data }: { data: WaybackResult }) {
  const closest = data.availability?.archived_snapshots?.closest;
  const snaps   = data.snapshots.slice(1);
  return (
    <div className="space-y-4">
      {closest?.available ? (
        <div className="p-4 bg-lime-950/20 border border-lime-800/30 rounded-xl">
          <p className="text-lime-400 font-bold text-sm font-mono mb-1">Latest snapshot: {closest.timestamp}</p>
          <a href={closest.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm break-all font-mono underline">
            {closest.url}
          </a>
        </div>
      ) : <p className="text-zinc-400 text-sm font-mono">No snapshot found.</p>}
      {snaps.length > 0 && (
        <div>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">History — {snaps.length} snapshots</p>
          <div className="bg-black/40 rounded-xl overflow-auto max-h-64 border border-zinc-800">
            <table className="w-full text-xs font-mono">
              <thead><tr className="border-b border-zinc-800">
                <th className="text-left p-2 text-zinc-500">Timestamp</th>
                <th className="text-left p-2 text-zinc-500">Status</th>
                <th className="p-2 text-zinc-500">Link</th>
              </tr></thead>
              <tbody>
                {snaps.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-800/30">
                    <td className="p-2 text-zinc-300">{row[0]}</td>
                    <td className="p-2"><StatusPill code={parseInt(row[1]) || null} /></td>
                    <td className="p-2 text-center">
                      <a href={`https://web.archive.org/web/${row[0]}/${row[3]}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">↗</a>
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

function SubdomainsView({ data }: { data: SubdomainsResult }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-mono text-zinc-400">
        checked <b className="text-white">{data.checked}</b> prefixes on <b className="text-white">{data.domain}</b> · resolved <b className="text-lime-400">{data.found.length}</b>
      </p>
      {data.found.length > 0 ? (
        <div className="space-y-2">
          {data.found.map(entry => (
            <div key={entry.subdomain} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between gap-4 hover:border-zinc-700 transition-colors">
              <span className="font-mono text-lime-300 text-sm">{entry.subdomain}</span>
              <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                {entry.cname && <span className="text-yellow-300 truncate max-w-32">→ {entry.cname}</span>}
                <span className="text-zinc-400">{entry.ips.join(", ")}</span>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-zinc-500 text-sm font-mono">No subdomains resolved from the wordlist.</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WebPage() {
  const [active,     setActive]     = useState<Tool>(TOOLS[0]);
  const [domain,     setDomain]     = useState("");
  const [probeDomain,setProbeDomain]= useState("");
  const [url,        setUrl]        = useState("");
  const [cookieStr,  setCookieStr]  = useState("");
  const [jwtToken,   setJwtToken]   = useState("");
  const [crackJwt,   setCrackJwt]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState<unknown>(null);
  const [error,      setError]      = useState<string | null>(null);

  const selectTool = (tool: Tool) => { setActive(tool); setResult(null); setError(null); };

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      let data: unknown;
      if (active.group === "osint") {
        data = await runOsint(active.id, domain);
      } else {
        const params: Record<string, unknown> = {};
        if (active.inputKind === "domain_probe") params.domain = probeDomain;
        else if (active.inputKind === "jwt")           { params.token = jwtToken; params.crack = crackJwt; }
        else if (active.inputKind === "url_and_cookie"){ if (url) params.url = url; if (cookieStr) params.cookies = cookieStr; }
        else                                            params.url = url;
        data = await runProbe(active.id, params);
      }
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally { setLoading(false); }
  };

  const canRun =
    active.group === "osint"               ? domain.trim().length > 0 :
    active.inputKind === "domain_probe"    ? probeDomain.trim().length > 0 :
    active.inputKind === "jwt"             ? jwtToken.trim().length > 0 :
    active.inputKind === "url_and_cookie"  ? url.trim().length > 0 || cookieStr.trim().length > 0 :
                                             url.trim().length > 0;

  const osintTools = TOOLS.filter(t => t.group === "osint");
  const probeTools = TOOLS.filter(t => t.group === "probe");

  const renderResult = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
        <Loader2 size={32} className="animate-spin mb-3 text-primary" />
        <p className="text-sm font-mono">running {active.name}…</p>
      </div>
    );
    if (error) return (
      <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-xl text-red-300 text-sm font-mono">
        <p className="font-bold mb-1">Error</p><p>{error}</p>
      </div>
    );
    if (result === null) return (
      <div className="flex flex-col items-center justify-center h-52 text-muted-foreground opacity-20">
        <ChevronRight size={32} className="mb-2" />
        <p className="text-sm font-mono">select a tool and enter a target</p>
      </div>
    );
    if (active.id === "leaks")       return <LeaksView      data={result as LeaksResult}      />;
    if (active.id === "dirbust")     return <DirbustView    data={result as DirbustResult}    />;
    if (active.id === "ctf_headers") return <HeadersView    data={result as HeadersResult}    />;
    if (active.id === "cookies")     return <CookiesView    data={result as CookiesResult}    />;
    if (active.id === "jwt")         return <JwtView        data={result as JwtResult}        />;
    if (active.id === "wayback")     return <WaybackView    data={result as WaybackResult}    />;
    if (active.id === "subdomains")  return <SubdomainsView data={result as SubdomainsResult} />;
    return (
      <pre className="text-sm font-mono text-green-300 bg-black/40 rounded-xl p-4 whitespace-pre-wrap border border-zinc-800 max-h-[480px] overflow-auto">
        {typeof result === "object" ? JSON.stringify(result, null, 2) : String(result)}
      </pre>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <span className="px-3 py-1 text-xs font-mono font-semibold tracking-wider text-lime-400 bg-lime-950/40 border border-lime-800/30 rounded-full uppercase">
            Network Intelligence
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mt-3 mb-3 tracking-tight">
            Web <span className="text-lime-400">Analysis</span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl">
            Passive reconnaissance and active probing — subdomain discovery, leak scanning, header analysis, JWT decoding and more.
          </p>
        </motion.div>

        <div className="flex gap-6">

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <aside className="w-56 shrink-0 space-y-1">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 px-3 pb-2">OSINT</p>
            {osintTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => selectTool(tool)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                  active.id === tool.id
                    ? "bg-primary/15 border border-primary/30 text-primary font-medium"
                    : "border border-transparent text-muted-foreground hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <tool.icon size={14} className="shrink-0" />
                <span className="truncate">{tool.name}</span>
              </button>
            ))}

            <div className="pt-4">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 px-3 pb-2">Probe</p>
              {probeTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => selectTool(tool)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                    active.id === tool.id
                      ? "bg-lime-500/10 border border-lime-500/30 text-lime-300 font-medium"
                      : "border border-transparent text-muted-foreground hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <tool.icon size={14} className="shrink-0" />
                  <span className="truncate">{tool.name}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* ── Main panel ───────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">

            {/* Tool input card */}
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${active.group === "probe" ? "bg-lime-950/40 border-lime-800/30 text-lime-400" : "bg-primary/10 border-primary/20 text-primary"}`}>
                    <active.icon size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white font-mono tracking-tight">{active.name}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{active.desc}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border uppercase tracking-wider ${
                  active.group === "probe"
                    ? "bg-lime-950/40 border-lime-800/30 text-lime-400"
                    : "bg-primary/10 border-primary/20 text-primary"
                }`}>{active.group}</span>
              </div>

              <form onSubmit={handleRun} className="mt-5 space-y-3">
                {/* OSINT domain input */}
                {active.group === "osint" && (
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                      <input
                        type="text" placeholder="example.com or IP address"
                        value={domain} onChange={e => setDomain(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 bg-background border border-border rounded-xl font-mono text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40"
                        required
                      />
                    </div>
                    <button type="submit" disabled={loading || !canRun}
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm">
                      {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                      {loading ? "Scanning…" : "Scan"}
                    </button>
                  </div>
                )}

                {/* Probe domain input (subdomain finder) */}
                {active.group === "probe" && active.inputKind === "domain_probe" && (
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                      <input
                        type="text" placeholder="example.com"
                        value={probeDomain} onChange={e => setProbeDomain(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 bg-background border border-border rounded-xl font-mono text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-500/40"
                      />
                    </div>
                    <button type="submit" disabled={loading || !canRun}
                      className="bg-lime-600 hover:bg-lime-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm">
                      {loading ? <Loader2 size={15} className="animate-spin" /> : <Network size={15} />}
                      {loading ? "Resolving…" : "Find"}
                    </button>
                  </div>
                )}

                {/* Probe URL input */}
                {active.group === "probe" && active.inputKind === "url" && (
                  <div className="flex gap-3">
                    <input
                      type="text" placeholder="https://target.example.com"
                      value={url} onChange={e => setUrl(e.target.value)}
                      className="flex-1 px-4 py-3 bg-background border border-border rounded-xl font-mono text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-500/40"
                    />
                    <button type="submit" disabled={loading || !canRun}
                      className="bg-lime-600 hover:bg-lime-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm">
                      {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                      {loading ? "Running…" : "Run"}
                    </button>
                  </div>
                )}

                {/* URL + cookie input */}
                {active.group === "probe" && active.inputKind === "url_and_cookie" && (
                  <>
                    <input type="text" placeholder="https://target.example.com (optional)"
                      value={url} onChange={e => setUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-mono text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-500/40"
                    />
                    <textarea placeholder="Or paste raw cookie string: session=abc123; token=xyz"
                      value={cookieStr} onChange={e => setCookieStr(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-mono text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-500/40 resize-none h-16"
                    />
                    <button type="submit" disabled={loading || !canRun}
                      className="w-full bg-lime-600 hover:bg-lime-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-2 text-sm">
                      {loading ? <Loader2 size={15} className="animate-spin" /> : <Cookie size={15} />}
                      {loading ? "Analyzing…" : "Analyze Cookies"}
                    </button>
                  </>
                )}

                {/* JWT input */}
                {active.group === "probe" && active.inputKind === "jwt" && (
                  <>
                    <textarea placeholder="Paste JWT token (eyJ…)"
                      value={jwtToken} onChange={e => setJwtToken(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl font-mono text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-lime-500/40 resize-none h-24"
                    />
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                      <input type="checkbox" checked={crackJwt} onChange={e => setCrackJwt(e.target.checked)} className="accent-lime-500" />
                      Attempt HS256 secret brute-force
                    </label>
                    <button type="submit" disabled={loading || !canRun}
                      className="w-full bg-lime-600 hover:bg-lime-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-2 text-sm">
                      {loading ? <Loader2 size={15} className="animate-spin" /> : <Key size={15} />}
                      {loading ? "Decoding…" : "Decode"}
                    </button>
                  </>
                )}
              </form>
            </motion.div>

            {/* Results card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id + String(loading) + String(!!result)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-card border border-border rounded-2xl p-6 shadow-xl min-h-[280px] flex flex-col"
              >
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-4 border-b border-border/50 pb-3">
                  Output — {active.name}
                </p>
                <div className="flex-1 overflow-y-auto">
                  {renderResult()}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
