"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileUpload } from "@/components/ui/file-upload";
import { Music, X, Loader2, ChevronRight, HelpCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnalysisResult = { [tool: string]: string | object | undefined };

interface SpectrogramResult { image: string | null; message: string }
interface SteghideResult    { password_found: boolean; password: string | null; extracted_data: string | null; message: string }

const TOOL_LABELS: Record<string, string> = {
  file_type:       "File Type",
  hashes:          "File Hashes",
  xxd:             "Hex Dump",
  strings:         "Strings",
  binwalk:         "Binwalk",
  foremost:        "Foremost",
  exiftool:        "ExifTool Metadata",
  ffmpeg_info:     "FFmpeg Info",
  sox_info:        "Sox Audio Info",
  sox_spectrogram: "Spectrogram",
  mediainfo:       "MediaInfo",
  dtmf_detect:     "DTMF Tones",
  morse_detect:    "Morse Code",
  rtty_decode:     "RTTY / Baudot",
  steghide_crack:  "Steghide Crack",
};

function isNotInstalled(result: unknown): boolean {
  if (typeof result !== "string") return false;
  const r = result.toLowerCase();
  return r.includes("not installed") || r.includes("not available in path");
}

function isUnsupported(result: unknown): boolean {
  if (typeof result !== "string") return false;
  const r = result.toLowerCase();
  return r.includes("only works with") || r.includes("only operates on") || r.includes("not available for this file type");
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ToolCard({ tool, result }: { tool: string; result: string | object | undefined }) {
  const label = TOOL_LABELS[tool] ?? tool;

  if (isNotInstalled(result)) return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 opacity-40">
      <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider w-36 shrink-0">{label}</span>
      <span className="text-xs text-zinc-600 font-mono">not installed</span>
    </div>
  );

  if (isUnsupported(result)) return null;

  // Spectrogram
  if (tool === "sox_spectrogram" && result && typeof result === "object") {
    const r = result as SpectrogramResult;
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xl">
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3">{label}</p>
        {r.image ? (
          <div className="space-y-2">
            <img src={`data:image/png;base64,${r.image}`} alt="Spectrogram" className="w-full rounded-lg border border-border" />
            <p className="text-xs text-muted-foreground font-mono">{r.message}</p>
          </div>
        ) : <p className="text-xs font-mono text-zinc-500">{r.message}</p>}
      </div>
    );
  }

  // Steghide crack
  if (tool === "steghide_crack" && result && typeof result === "object") {
    const r = result as SteghideResult;
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xl">
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3">{label}</p>
        {r.password_found ? (
          <div className="space-y-3">
            <div className="p-3 bg-lime-950/30 border border-lime-800/30 rounded-xl">
              <p className="text-lime-400 text-xs font-bold font-mono mb-1">Password found</p>
              <code className="text-lime-200 bg-black/40 px-2 py-0.5 rounded text-sm">{r.password}</code>
            </div>
            {r.extracted_data && (
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-1">Extracted data</p>
                <pre className="text-lime-200 text-xs bg-black/40 rounded-xl p-3 max-h-48 overflow-auto whitespace-pre-wrap select-all border border-zinc-800">
                  {r.extracted_data}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl">
            <p className="text-amber-300 text-xs font-mono">{r.message}</p>
          </div>
        )}
      </div>
    );
  }

  // Hashes with VirusTotal links
  if (tool === "hashes" && typeof result === "string") {
    const lines = result.split("\n").filter(l => l.trim() && !l.includes("/tmp/"));
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xl">
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary mb-3">{label}</p>
        <div className="space-y-2">
          {lines.map((line, i) => {
            const m = line.match(/([a-fA-F0-9]{32,64})/);
            if (m) return (
              <div key={i} className="flex items-center justify-between bg-black/40 rounded-lg px-3 py-2 border border-zinc-800 gap-3">
                <code className="font-mono text-green-300 text-xs break-all">{m[1]}</code>
                <a href={`https://www.virustotal.com/gui/search/${m[1]}`} target="_blank" rel="noreferrer"
                  className="shrink-0 px-2 py-1 text-xs font-bold bg-blue-900/30 border border-blue-700/40 text-blue-300 rounded-lg hover:bg-blue-900/50 transition-colors">
                  VT ↗
                </a>
              </div>
            );
            return <p key={i} className="text-zinc-500 text-xs font-mono uppercase tracking-wider pt-1">{line.replace(":", "")}</p>;
          })}
        </div>
      </div>
    );
  }

  // Default card
  const isError = typeof result === "string" && (
    result.toLowerCase().includes("error") ||
    result.toLowerCase().includes("failed") ||
    result.toLowerCase().includes("cannot") ||
    result.includes("Exception")
  );
  const isEmpty = !result || (typeof result === "string" && result.trim() === "");

  if (isEmpty) return null;

  return (
    <div className={`bg-card border ${isError ? "border-red-900/40" : "border-border"} rounded-2xl p-5 shadow-xl`}>
      <p className={`text-xs font-mono font-bold uppercase tracking-wider mb-3 ${isError ? "text-red-400" : "text-primary"}`}>
        {label}
      </p>
      <pre className={`${isError ? "text-red-300" : "text-green-300"} text-xs font-mono whitespace-pre-wrap max-h-56 overflow-auto bg-black/40 rounded-xl p-3 border border-zinc-800`}>
        {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AudioForensics() {
  const [uploadedFile,   setUploadedFile]   = useState<{ name: string; url: string; key?: string; size?: number } | null>(null);
  const [fileUploadKey,  setFileUploadKey]  = useState(Date.now());
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError,  setAnalysisError]  = useState<string | null>(null);
  const [isAnalysing,    setIsAnalysing]    = useState(false);
  const [statusMsg,      setStatusMsg]      = useState("");

  const handleFileChange = async (files: File[]) => {
    if (!files.length) return;
    const f = files[0];
    const formData = new FormData();
    formData.append("file", f);
    try {
      const res  = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.key) {
        setUploadedFile({ name: f.name, url: data.url, key: data.key, size: f.size });
        setAnalysisResult(null);
        setAnalysisError(null);
      } else {
        alert("Upload failed: " + (data.error ?? "Unknown error"));
      }
    } catch {
      alert("Upload failed — network error.");
    }
  };

  const handleAnalysis = async () => {
    if (!uploadedFile?.key) return;
    setIsAnalysing(true);
    setAnalysisResult({});
    setAnalysisError(null);
    setStatusMsg("Starting analysis…");

    try {
      const res = await fetch("/api/run-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: uploadedFile.key }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "Server error");
        setAnalysisError(text);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.substring(6));
            if (parsed.error) { setAnalysisError(parsed.error); break outer; }
            if (parsed.status === "progress") {
              setStatusMsg(parsed.message ?? "");
              if (parsed.partial_result && parsed.tool)
                setAnalysisResult(prev => ({ ...(prev ?? {}), [parsed.tool]: parsed.partial_result }));
            } else if (parsed.status === "complete") {
              setAnalysisResult(parsed.results);
              setStatusMsg("");
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalysing(false);
      setStatusMsg("");
    }
  };

  const clearFile = async () => {
    if (uploadedFile?.key) {
      fetch(`/api/upload?key=${uploadedFile.key}`, { method: "DELETE" }).catch(() => {});
    }
    setUploadedFile(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setFileUploadKey(Date.now());
  };

  const fmtSize = (b?: number) => {
    if (!b) return "";
    if (b < 1024)    return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  };

  const FORMATS = ["WAV","MP3","FLAC","OGG","M4A","AAC","MP4","AU","OPUS"];

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <span className="px-3 py-1 text-xs font-mono font-semibold tracking-wider text-lime-400 bg-lime-950/40 border border-lime-800/30 rounded-full uppercase">
            Audio Forensics
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mt-3 mb-3 tracking-tight">
            Audio <span className="text-lime-400">Analysis</span>
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base">
            Spectrogram, DTMF, Morse code, RTTY, metadata extraction, steghide cracking and more.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {FORMATS.map(f => (
              <span key={f} className="px-3 py-1 text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full">.{f.toLowerCase()}</span>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!uploadedFile ? (
            /* ── Drop zone ─────────────────────────────────────────────── */
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="max-w-xl mx-auto"
            >
              <FileUpload key={fileUploadKey} onChange={handleFileChange} />

              <div className="mt-6 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex gap-3 text-xs text-zinc-400">
                <HelpCircle className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-200 font-semibold">What gets run:</span>{" "}
                  FFmpeg metadata, Sox spectrogram, DTMF tone detection, Morse code decoding, RTTY/Baudot signals, file hashes, hex dump, binwalk, exiftool, steghide password cracking.
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── Analysis view ─────────────────────────────────────────── */
            <motion.div
              key="analysis"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              {/* File info bar */}
              <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-lime-950/40 border border-lime-800/20 rounded-xl text-lime-400">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200 font-mono truncate max-w-xs">{uploadedFile.name}</p>
                    <p className="text-xs text-zinc-500">{fmtSize(uploadedFile.size)}</p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-red-400 bg-zinc-800/50 hover:bg-red-500/10 border border-zinc-700/50 hover:border-red-500/20 rounded-xl transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>

              {/* Run button */}
              {!analysisResult || Object.keys(analysisResult).length === 0 ? (
                <button
                  onClick={handleAnalysis}
                  disabled={isAnalysing}
                  className="w-full bg-gradient-to-r from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg text-sm"
                >
                  {isAnalysing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {statusMsg || "Analysing…"}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      Run Full Analysis
                    </span>
                  )}
                </button>
              ) : isAnalysing ? (
                <div className="w-full flex items-center justify-center gap-2 py-4 text-sm text-zinc-400 font-mono">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {statusMsg}
                </div>
              ) : null}

              {/* Error */}
              {analysisError && (
                <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-2xl text-red-300 text-sm font-mono">
                  {analysisError}
                </div>
              )}

              {/* Results grid */}
              {analysisResult && Object.keys(analysisResult).length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {Object.keys(analysisResult).map(tool => (
                    <ToolCard key={tool} tool={tool} result={analysisResult[tool]} />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
