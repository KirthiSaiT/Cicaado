"use client";

import React, { useState, useRef, useEffect } from "react";

type Channel = "red" | "green" | "blue";

interface StegsolveProps {
  file: File;
}

const CHANNELS: { key: Channel; label: string; activeClass: string }[] = [
  { key: "red",   label: "Red",   activeClass: "border-red-500 bg-red-500/10 text-red-400" },
  { key: "green", label: "Green", activeClass: "border-green-500 bg-green-500/10 text-green-400" },
  { key: "blue",  label: "Blue",  activeClass: "border-blue-500 bg-blue-500/10 text-blue-400" },
];

// Render a single bit plane of a channel onto a canvas
function renderBitPlane(
  canvas: HTMLCanvasElement,
  src: ImageData,
  channel: Channel,
  bit: number
) {
  const { width, height } = src;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const out = ctx.createImageData(width, height);
  const chOffset = channel === "red" ? 0 : channel === "green" ? 1 : 2;

  for (let i = 0; i < width * height; i++) {
    const val = ((src.data[i * 4 + chOffset] >> bit) & 1) * 255;
    out.data[i * 4]     = val;
    out.data[i * 4 + 1] = val;
    out.data[i * 4 + 2] = val;
    out.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);
}

// Render a single channel (R, G, or B) in its colour onto a canvas
function renderChannel(
  canvas: HTMLCanvasElement,
  src: ImageData,
  channel: Channel
) {
  const { width, height } = src;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const out = ctx.createImageData(width, height);
  const chOffset = channel === "red" ? 0 : channel === "green" ? 1 : 2;

  for (let i = 0; i < width * height; i++) {
    const val = src.data[i * 4 + chOffset];
    out.data[i * 4]     = channel === "red"   ? val : 0;
    out.data[i * 4 + 1] = channel === "green" ? val : 0;
    out.data[i * 4 + 2] = channel === "blue"  ? val : 0;
    out.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(out, 0, 0);
}

const Stegsolve: React.FC<StegsolveProps> = ({ file }) => {
  const [channel, setChannel]   = useState<Channel>("red");
  const [bitPlane, setBitPlane] = useState<number>(0);
  const [mode, setMode]         = useState<"channel" | "bitplane">("bitplane");
  const [imageData, setImageData]       = useState<ImageData | null>(null);
  const [dimensions, setDimensions]     = useState<{ w: number; h: number } | null>(null);

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs     = useRef<(HTMLCanvasElement | null)[]>([]);

  // Load image into ImageData when file changes
  useEffect(() => {
    if (!file) return;
    setImageData(null);
    setDimensions(null);

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const offscreen = document.createElement("canvas");
      offscreen.width  = img.width;
      offscreen.height = img.height;
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      setImageData(ctx.getImageData(0, 0, img.width, img.height));
      setDimensions({ w: img.width, h: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, [file]);

  // Redraw main canvas whenever selection changes
  useEffect(() => {
    if (!imageData || !mainCanvasRef.current) return;
    if (mode === "bitplane") {
      renderBitPlane(mainCanvasRef.current, imageData, channel, bitPlane);
    } else {
      renderChannel(mainCanvasRef.current, imageData, channel);
    }
  }, [imageData, channel, bitPlane, mode]);

  // Redraw all 8 thumbnails when channel or imageData changes
  useEffect(() => {
    if (!imageData) return;
    for (let bit = 0; bit < 8; bit++) {
      const canvas = thumbRefs.current[bit];
      if (canvas) renderBitPlane(canvas, imageData, channel, bit);
    }
  }, [imageData, channel]);

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 p-6 bg-card border border-border rounded-2xl shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-primary font-mono">
          Stegsolve — Bit Plane Viewer
        </h2>
        {dimensions && (
          <span className="text-xs text-muted-foreground font-mono">
            {file.name} &nbsp;·&nbsp; {dimensions.w} × {dimensions.h}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        Inspect individual colour channel bit planes to detect hidden LSB steganography.
      </p>

      {/* Controls */}
      <div className="flex flex-wrap gap-6 mb-6">
        {/* Mode toggle */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">View Mode</p>
          <div className="flex gap-2">
            {(["bitplane", "channel"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded text-sm border transition-colors ${
                  mode === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {m === "bitplane" ? "Bit Plane" : "Full Channel"}
              </button>
            ))}
          </div>
        </div>

        {/* Channel selector */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Channel</p>
          <div className="flex gap-2">
            {CHANNELS.map(({ key, label, activeClass }) => (
              <button
                key={key}
                onClick={() => setChannel(key)}
                className={`px-3 py-1 rounded text-sm border transition-colors ${
                  channel === key
                    ? activeClass
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bit plane selector (only in bitplane mode) */}
        {mode === "bitplane" && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Bit Plane</p>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((bit) => (
                <button
                  key={bit}
                  onClick={() => setBitPlane(bit)}
                  className={`w-9 h-9 rounded text-sm font-mono border transition-colors ${
                    bitPlane === bit
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {bit}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {!imageData && (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
          Loading image data...
        </div>
      )}

      {imageData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main canvas */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-mono">
              {CHANNELS.find((c) => c.key === channel)?.label} channel
              {mode === "bitplane"
                ? ` · Bit ${bitPlane}${bitPlane === 0 ? " (LSB)" : bitPlane === 7 ? " (MSB)" : ""}`
                : " · full"}
            </p>
            <canvas
              ref={mainCanvasRef}
              className="w-full rounded-lg border border-border"
              style={{ imageRendering: "pixelated" }}
            />
            {mode === "bitplane" && bitPlane === 0 && (
              <p className="text-xs text-yellow-500 mt-2">
                ⚠ LSB (Bit 0) — most likely location for hidden data. Uniform or patterned noise may indicate steganography.
              </p>
            )}
          </div>

          {/* Bit plane thumbnails */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-mono">
              All 8 bit planes — {CHANNELS.find((c) => c.key === channel)?.label}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((bit) => (
                <button
                  key={bit}
                  onClick={() => { setBitPlane(bit); setMode("bitplane"); }}
                  className={`relative rounded overflow-hidden border transition-colors ${
                    mode === "bitplane" && bitPlane === bit
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <canvas
                    ref={(el) => { thumbRefs.current[bit] = el; }}
                    style={{ imageRendering: "pixelated", display: "block", width: "100%" }}
                  />
                  <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] bg-black/70 text-white py-0.5">
                    Bit {bit}{bit === 0 ? " LSB" : ""}
                  </span>
                </button>
              ))}
            </div>

            {/* LSB summary */}
            <div className="mt-4 p-3 bg-background border border-border rounded-lg">
              <p className="text-xs font-mono text-muted-foreground mb-1">LSB Bit 0 stats</p>
              {(["red", "green", "blue"] as Channel[]).map((ch) => {
                const chOffset = ch === "red" ? 0 : ch === "green" ? 1 : 2;
                let ones = 0;
                const total = imageData.width * imageData.height;
                for (let i = 0; i < total; i++) {
                  ones += imageData.data[i * 4 + chOffset] & 1;
                }
                const pct = ((ones / total) * 100).toFixed(1);
                const suspicious = parseFloat(pct) > 48 && parseFloat(pct) < 52;
                return (
                  <div key={ch} className="flex items-center gap-2 text-xs mb-1">
                    <span
                      className={`w-12 font-mono ${
                        ch === "red" ? "text-red-400" : ch === "green" ? "text-green-400" : "text-blue-400"
                      }`}
                    >
                      {ch.charAt(0).toUpperCase() + ch.slice(1)}:
                    </span>
                    <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ch === "red" ? "bg-red-500" : ch === "green" ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-12 text-right">{pct}%</span>
                    {suspicious && (
                      <span className="text-yellow-500 text-[10px]">⚠ ~50%</span>
                    )}
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground mt-2">
                ~50% ones in LSB suggests possible steganographic content (random-looking data).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stegsolve;
