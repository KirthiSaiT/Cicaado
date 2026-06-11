"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Waves, Globe, Layers, ChevronRight } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    href:  "/forensics",
    icon:  Shield,
    badge: "20+ tools",
    title: "Image Forensics",
    desc:  "Full pipeline — zsteg, binwalk, exiftool, steghide, OCR, QR, stegoveritas and more. Results stream in real time.",
    tools: ["zsteg","binwalk","exiftool","foremost","steghide","stegoveritas","pngcheck","outguess","jsteg","tesseract"],
    accent: "lime",
    glow:   "rgba(132,204,22,0.12)",
    border: "border-lime-800/30",
    tag:    "bg-lime-950/60 text-lime-400 border-lime-800/30",
    icon_bg:"bg-lime-950/60 border-lime-800/30 text-lime-400",
  },
  {
    href:  "/audio",
    icon:  Waves,
    badge: "signal decode",
    title: "Audio Analysis",
    desc:  "Spectrogram, DTMF tones, Morse code, RTTY/Baudot signals, FFmpeg metadata, steghide cracking.",
    tools: ["spectrogram","dtmf","morse","rtty","ffmpeg","sox","mediainfo","steghide"],
    accent: "cyan",
    glow:   "rgba(6,182,212,0.10)",
    border: "border-cyan-800/30",
    tag:    "bg-cyan-950/60 text-cyan-400 border-cyan-800/30",
    icon_bg:"bg-cyan-950/60 border-cyan-800/30 text-cyan-400",
  },
  {
    href:  "/web",
    icon:  Globe,
    badge: "17 tools",
    title: "Web Intelligence",
    desc:  "OSINT recon, subdomain finder, leak scanner, directory buster, JWT analyzer, Wayback Machine.",
    tools: ["whois","dns","subdomains","leaks","dirbust","jwt","wayback","ssl","cors","waf"],
    accent: "violet",
    glow:   "rgba(139,92,246,0.10)",
    border: "border-violet-800/30",
    tag:    "bg-violet-950/60 text-violet-400 border-violet-800/30",
    icon_bg:"bg-violet-950/60 border-violet-800/30 text-violet-400",
  },
  {
    href:  "/steg",
    icon:  Layers,
    badge: "in-browser",
    title: "Bit Plane Viewer",
    desc:  "Inspect all 8 bit planes per R/G/B channel locally. LSB entropy stats. Zero server upload.",
    tools: ["bit planes 0–7","R / G / B","LSB stats","local only"],
    accent: "amber",
    glow:   "rgba(251,191,36,0.08)",
    border: "border-amber-800/30",
    tag:    "bg-amber-950/60 text-amber-400 border-amber-800/30",
    icon_bg:"bg-amber-950/60 border-amber-800/30 text-amber-400",
  },
];

const ALL_TOOLS = [
  "zsteg","binwalk","exiftool","steghide","stegseek","foremost","outguess","stegoveritas",
  "pngcheck","tesseract","jsteg","zbarimg","imagemagick","xxd","strings","ffmpeg",
  "sox spectrogram","dtmf","morse","rtty","mediainfo","whois","dns records","subdomains",
  "leak scanner","dir buster","jwt analyzer","cookie decoder","wayback","ssl/tls","cors",
  "waf detect","email scraper","bit planes","lsb stats","s3 buckets","sensitive files",
];

const STATS = [
  { value: "30+", label: "Forensic Tools" },
  { value: "4",   label: "Analysis Modules" },
  { value: "Live", label: "Streaming Results" },
  { value: "Free", label: "Open Source" },
];

// ─── Marquee ──────────────────────────────────────────────────────────────────

function Marquee() {
  const items = [...ALL_TOOLS, ...ALL_TOOLS];
  return (
    <div className="overflow-hidden py-3 border-y border-zinc-800/60 select-none">
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {items.map((t, i) => (
          <span key={i} className="text-xs font-mono text-zinc-500 flex items-center gap-2 shrink-0">
            <span className="w-1 h-1 rounded-full bg-lime-500/50 inline-block" />
            {t}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ f, i }: { f: typeof FEATURES[0]; i: number }) {
  const Icon = f.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
    >
      <Link href={f.href} className="group block h-full">
        <div
          className={`relative h-full bg-zinc-950 border ${f.border} rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl overflow-hidden`}
          style={{ boxShadow: `0 0 0 1px transparent` }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 40px ${f.glow}`)}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 0 1px transparent")}
        >
          {/* Subtle glow bg */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${f.glow}, transparent 70%)` }} />

          {/* Header */}
          <div className="flex items-start justify-between relative z-10">
            <div className={`p-2.5 rounded-xl border ${f.icon_bg}`}>
              <Icon size={20} />
            </div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${f.tag}`}>
              {f.badge}
            </span>
          </div>

          {/* Title + desc */}
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-white tracking-tight font-mono mb-2">{f.title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
          </div>

          {/* Tool pills */}
          <div className="flex flex-wrap gap-1.5 mt-auto relative z-10">
            {f.tools.map(t => (
              <span key={t} className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full">
                {t}
              </span>
            ))}
          </div>

          {/* Arrow */}
          <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
            <ChevronRight size={16} className="text-zinc-400" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">

      {/* ── Grid background ────────────────────────────────────────────────── */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(132,204,22,0.03) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(132,204,22,0.03) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(132,204,22,0.08), transparent)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-64"
          style={{ background: "linear-gradient(to top, hsl(var(--background)), transparent)" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="pt-16 pb-10 flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono font-semibold tracking-wider text-lime-400 bg-lime-950/40 border border-lime-800/30 rounded-full uppercase mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
              Forensics · Analysis · Intelligence
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl md:text-8xl font-extrabold tracking-tighter leading-none mb-6"
          >
            <span className="text-white">Cic</span>
            <span className="text-lime-400">aado</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
          >
            A complete forensics platform — upload any file and run the full suite of
            steganography, metadata, and signal analysis tools instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link href="/forensics">
              <button className="inline-flex items-center gap-2 px-7 py-3.5 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl transition-all duration-200 shadow-[0_0_24px_rgba(132,204,22,0.35)] hover:shadow-[0_0_40px_rgba(132,204,22,0.55)] text-sm">
                Start Analysing
                <ArrowRight size={16} />
              </button>
            </Link>
            <Link href="/web">
              <button className="inline-flex items-center gap-2 px-7 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-200 font-semibold rounded-xl transition-all text-sm">
                Web Intelligence
              </button>
            </Link>
          </motion.div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          {STATS.map((s, i) => (
            <div key={i} className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-4 text-center">
              <p className="text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight">{s.value}</p>
              <p className="text-xs text-zinc-500 font-mono mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Marquee ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mb-8"
        >
          <Marquee />
        </motion.div>

        {/* ── Feature cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {FEATURES.map((f, i) => <FeatureCard key={f.href} f={f} i={i} />)}
        </div>

        {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="relative bg-zinc-950 border border-zinc-800/60 rounded-2xl p-10 text-center mb-12 overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(132,204,22,0.06), transparent)" }}
          />
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-lime-400 mb-3">Ready to start?</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
            Upload a file. Run everything.
          </h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto text-sm">
            Drag and drop any image, audio file, or archive. All tools run automatically and stream results as they finish.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/forensics">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(132,204,22,0.3)] text-sm">
                Image Forensics <ArrowRight size={15} />
              </button>
            </Link>
            <Link href="/audio">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold rounded-xl transition-all text-sm">
                Audio Analysis <ArrowRight size={15} />
              </button>
            </Link>
            <Link href="/steg">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold rounded-xl transition-all text-sm">
                Bit Plane Viewer <ArrowRight size={15} />
              </button>
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
