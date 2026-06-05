"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { FileUpload } from "@/components/ui/file-upload";

type AnalysisResult = { [tool: string]: string | object | undefined };

// Deterministic waveform heights using sine composites
const WAVE_BARS = Array.from({ length: 52 }, (_, i) => ({
  height: Math.round(14 + Math.abs(Math.sin(i * 0.38)) * 22 + Math.abs(Math.sin(i * 1.1)) * 16 + Math.abs(Math.cos(i * 0.72)) * 10),
  delay: i * 0.033,
  colorIdx: i % 3,
}));
const BAR_COLORS = [
  "linear-gradient(to top, #0891b2, #67e8f9)",
  "linear-gradient(to top, #7c3aed, #c4b5fd)",
  "linear-gradient(to top, #0e7490, #a5f3fc)",
];

// ─── Tool result cards (matches forensics page style) ────────────────────────

interface SpectrogramResult { image: string | null; message: string }
interface SteghideResult    { password_found: boolean; password: string | null; extracted_data: string | null; message: string }

const TOOL_LABELS: Record<string, string> = {
  file_type:       "File Type Detection",
  hashes:          "File Hashes & Malware Check",
  xxd:             "Hex Dump",
  strings:         "Strings",
  binwalk:         "Binwalk",
  foremost:        "Foremost File Carver",
  exiftool:        "ExifTool Metadata",
  ssdeep:          "ssdeep Fuzzy Hash",
  ffmpeg_info:     "FFmpeg Audio Info",
  sox_info:        "Sox Audio Info",
  sox_spectrogram: "Spectrogram",
  mediainfo:       "MediaInfo",
  dtmf_detect:     "DTMF Tone Detection",
  steghide_crack:  "Steghide Password Crack",
};

function ToolResultCard({ tool, result }: { tool: string; result: string | object | undefined }) {
  const label = TOOL_LABELS[tool] ?? tool;

  // Spectrogram — show the image
  if (tool === "sox_spectrogram" && result && typeof result === "object") {
    const r = result as SpectrogramResult;
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg">
        <h3 className="text-lime-400 text-xl font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
          Spectrogram
        </h3>
        {r.image ? (
          <div className="space-y-3">
            <p className="text-zinc-400 text-sm">{r.message}</p>
            <img
              src={`data:image/png;base64,${r.image}`}
              alt="Audio Spectrogram"
              className="w-full rounded-lg border border-zinc-700"
            />
          </div>
        ) : (
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 text-sm">
            ℹ️ {r.message}
          </div>
        )}
      </div>
    );
  }

  // Steghide crack
  if (tool === "steghide_crack" && result && typeof result === "object") {
    const r = result as SteghideResult;
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg">
        <h3 className="text-lime-400 text-xl font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
          Steghide Password Crack
        </h3>
        {r.password_found ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
              <h4 className="text-green-400 font-bold mb-2">✅ Password Found!</h4>
              <p className="text-green-300">Password: <span className="font-mono bg-zinc-800 px-2 py-1 rounded">{r.password}</span></p>
            </div>
            {r.extracted_data && (
              <div>
                <h4 className="text-lime-400 font-bold mb-2">Extracted Data:</h4>
                <pre className="text-green-300 whitespace-pre-wrap max-h-60 overflow-y-auto text-sm bg-black/80 rounded p-4 font-mono select-all">
                  {r.extracted_data}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg">
            <h4 className="text-amber-400 font-bold mb-2">⚠️ No Password Found</h4>
            <p className="text-amber-300">{r.message}</p>
          </div>
        )}
      </div>
    );
  }

  // Hashes with VirusTotal links
  if (tool === "hashes" && typeof result === "string") {
    const lines = result.split("\n").filter(l => l.trim() && !l.includes("/tmp/"));
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg">
        <h3 className="text-lime-400 text-xl font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
          File Hashes & Malware Check
        </h3>
        <div className="space-y-3 mt-4">
          {lines.map((line, i) => {
            const hashMatch = line.match(/([a-fA-F0-9]{32,64})/);
            if (hashMatch) {
              return (
                <div key={i} className="bg-black/80 p-3 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <span className="font-mono text-green-300 break-all">{hashMatch[1]}</span>
                  <a
                    href={`https://www.virustotal.com/gui/search/${hashMatch[1]}`}
                    target="_blank" rel="noreferrer"
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs font-bold rounded transition-colors flex items-center gap-1"
                  >
                    🔍 Check VirusTotal
                  </a>
                </div>
              );
            }
            return <div key={i} className="text-zinc-400 text-xs font-bold uppercase mt-4">{line.replace(":", "")}</div>;
          })}
        </div>
      </div>
    );
  }

  // Default card — same as forensics page
  const isError = typeof result === "string" && (
    result.toLowerCase().includes("error") ||
    result.toLowerCase().includes("failed") ||
    result.toLowerCase().includes("not found") ||
    result.toLowerCase().includes("not installed") ||
    result.includes("Exception")
  );

  return (
    <div className={`bg-zinc-900 border ${isError ? "border-red-900/50" : "border-zinc-700"} rounded-xl p-6 shadow-lg`}>
      <h3 className={`${isError ? "text-red-400" : "text-lime-400"} text-xl font-bold mb-3 uppercase tracking-wider flex items-center gap-2`}>
        <span className={`inline-block w-2 h-2 rounded-full ${isError ? "bg-red-500" : "bg-lime-400"} animate-pulse`} />
        {label} {isError && <span className="text-sm">⚠️ Error</span>}
      </h3>
      <pre className={`${isError ? "text-red-300" : "text-green-300"} whitespace-pre-wrap max-h-60 overflow-y-auto text-sm bg-black/80 rounded p-4`}>
        {result
          ? typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2)
          : "No output"}
      </pre>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AudioForensics() {
  const [uploadedFile, setUploadedFile] = useState<{
    name: string; url: string; key?: string; size?: number;
  } | null>(null);
  const [fileUploadKey,  setFileUploadKey]  = useState(Date.now());
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError,  setAnalysisError]  = useState<string | null>(null);
  const [isAnalysing,    setIsAnalysing]    = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");

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
    setAnalysisStatus("Starting analysis...");

    try {
      const res = await fetch("/api/run-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: uploadedFile.key }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "Server error");
        setAnalysisError(text);
        setIsAnalysing(false);
        setAnalysisStatus("");
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
            if (parsed.error) {
              setAnalysisError(parsed.error);
              setIsAnalysing(false);
              setAnalysisStatus("");
              break outer;
            }
            if (parsed.status === "progress") {
              setAnalysisStatus(parsed.message ?? "");
              if (parsed.partial_result && parsed.tool) {
                setAnalysisResult(prev => ({ ...(prev ?? {}), [parsed.tool]: parsed.partial_result }));
              }
            } else if (parsed.status === "complete") {
              setAnalysisResult(parsed.results);
              setAnalysisStatus("");
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Analysis failed");
    }
    setIsAnalysing(false);
    setAnalysisStatus("");
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
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Waveform Header ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden pt-20 pb-10 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-cyan-500/4 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex items-center justify-center gap-[3px] h-20 mb-6 overflow-hidden">
            {WAVE_BARS.map((bar, i) => (
              <motion.div
                key={i}
                className="rounded-full flex-shrink-0"
                style={{
                  width: "3px",
                  height: `${bar.height}px`,
                  background: BAR_COLORS[bar.colorIdx],
                  originY: 0.5,
                }}
                animate={{ scaleY: [0.18, 1, 0.18] }}
                transition={{
                  duration: 1.0 + (i % 6) * 0.12,
                  repeat: Infinity,
                  delay: bar.delay,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
          <h1 className="text-4xl font-bold mb-2">Audio Forensics</h1>
          <p className="text-lg text-zinc-400 mb-4">
            Upload an audio file and run the full forensic suite — spectrogram, steghide, metadata, DTMF detection and more.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["WAV", "MP3", "FLAC", "OGG", "M4A", "AAC", "MP4", "AU"].map(fmt => (
              <span key={fmt} className="px-3 py-1 text-xs font-mono bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full">
                .{fmt.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content (forensics page layout) ─────────────────────────── */}
      <main className="container mx-auto px-4 py-8">
        <FileUpload key={fileUploadKey} onChange={handleFileChange} />

        {uploadedFile && (
          <div className="mt-8">
            <h2 className="text-white text-lg font-medium mb-4">Selected File:</h2>

            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between text-gray-300">
                <div className="flex items-center space-x-3">
                  <span>🎵</span>
                  <span>{uploadedFile.name}</span>
                </div>
                <span className="text-sm text-gray-400">{fmtSize(uploadedFile.size)}</span>
              </div>
            </div>

            <button
              onClick={clearFile}
              className="text-red-400 hover:text-red-600 text-sm mb-4"
            >
              ❌ Delete File
            </button>

            <button
              className="w-full bg-gradient-to-r from-green-500 to-lime-600 hover:from-green-600 hover:to-lime-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 shadow-lg mb-4"
              onClick={handleAnalysis}
              disabled={isAnalysing}
            >
              {isAnalysing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  {analysisStatus || "Analysing..."}
                </span>
              ) : "Start Audio Analysis"}
            </button>

            {analysisResult && typeof analysisResult === "object" && (
              <div className="space-y-8 mt-10">
                {Object.keys(analysisResult).map(tool => (
                  <ToolResultCard key={tool} tool={tool} result={analysisResult[tool]} />
                ))}
              </div>
            )}

            {analysisError && (
              <div className="text-red-500 mt-4">{analysisError}</div>
            )}

            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 mt-8">
              <div className="flex items-start space-x-3">
                <div className="text-amber-500 mt-0.5">⚠️</div>
                <div>
                  <h3 className="text-amber-400 font-medium mb-1">Security Notice:</h3>
                  <p className="text-gray-300 text-sm">
                    Files are processed in a sandboxed environment and stored temporarily in MongoDB GridFS. Delete your file after analysis to remove it from storage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
