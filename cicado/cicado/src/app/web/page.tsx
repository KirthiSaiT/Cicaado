"use client";
import { useState } from "react";
import { Search, Loader2, Server, Shield, Globe, FileSearch, Code, Database, AlertTriangle } from "lucide-react";
import Nav from "@/components/Nav";

// Define the available tools based on cts_recon modules
const TOOLS = [
  { id: "whois_domain", name: "Whois Lookup", icon: Globe, desc: "Domain registration details", type: "deep" },
  { id: "dns_deep", name: "DNS Records", icon: Server, desc: "Comprehensive DNS analysis", type: "deep" },
  { id: "subdomain", name: "Subdomain Scanner", icon: Database, desc: "Find subdomains quickly", type: "lite" },
  { id: "headers", name: "HTTP Headers", icon: Code, desc: "Analyze response headers", type: "deep" },
  { id: "ssl_tls", name: "SSL/TLS Security", icon: Shield, desc: "Check certificate and config", type: "deep" },
  { id: "cors", name: "CORS Misconfig", icon: AlertTriangle, desc: "Check Cross-Origin policies", type: "deep" },
  { id: "bucket", name: "S3 Buckets", icon: Database, desc: "Search for exposed buckets", type: "deep" },
  { id: "sensitive", name: "Sensitive Files", icon: FileSearch, desc: "Look for .env, .git, etc.", type: "deep" },
  { id: "waf", name: "WAF Detection", icon: Shield, desc: "Detect Web Application Firewalls", type: "deep" },
  { id: "emailscrap", name: "Email Scraper", icon: Search, desc: "Scrape associated emails", type: "lite" },
];

export default function WebTools() {
  const [activeTool, setActiveTool] = useState(TOOLS[0]);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/recon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module_name: activeTool.id,
          domain: domain.trim(),
          deep: activeTool.type === "deep"
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to run scan");

      setResult(data[activeTool.id]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Nav />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 pt-24 pb-12 w-full flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Tools Menu */}
        <aside className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
          <h2 className="text-xl font-bold tracking-tight text-primary mb-4 px-2">Recon Tools</h2>
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => { setActiveTool(tool); setResult(null); setError(null); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200
                ${activeTool.id === tool.id 
                  ? "bg-primary/20 text-primary font-medium border border-primary/30" 
                  : "hover:bg-accent/10 text-muted-foreground border border-transparent"}`}
            >
              <tool.icon size={18} />
              <div className="flex flex-col">
                <span className="text-sm">{tool.name}</span>
                <span className="text-[10px] uppercase opacity-60">{tool.type} scan</span>
              </div>
            </button>
          ))}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6">
          
          <div className="bg-card/50 border border-border/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <activeTool.icon className="text-primary" size={24} />
              <h1 className="text-2xl font-bold">{activeTool.name}</h1>
            </div>
            <p className="text-muted-foreground mb-6">{activeTool.desc}</p>

            <form onSubmit={handleScan} className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="text-muted-foreground" size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Enter domain (e.g., example.com) or IP"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !domain.trim()}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                {loading ? "Scanning..." : "Scan"}
              </button>
            </form>
          </div>

          {/* Results Area */}
          <div className="flex-1 bg-card/50 border border-border/50 rounded-xl p-6 min-h-[300px] overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold mb-4 border-b border-border/50 pb-2">Results</h3>
            
            <div className="flex-1 overflow-y-auto font-mono text-sm">
              {loading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                  <Loader2 size={40} className="animate-spin mb-4" />
                  <p>Running {activeTool.name} on {domain}...</p>
                  <p className="text-xs mt-2">This may take a minute depending on the tool.</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500">
                  <p className="font-bold mb-1">Error</p>
                  <p>{error}</p>
                </div>
              )}

              {!loading && !error && result !== null && (
                <pre className="p-4 bg-black/40 rounded-lg overflow-x-auto text-green-400 whitespace-pre-wrap leading-relaxed">
                  {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
                </pre>
              )}

              {!loading && !error && result === null && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-30">
                  <Search size={40} className="mb-4" />
                  <p>Enter a target and click Scan</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
