"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, UploadCloud, X, HelpCircle } from "lucide-react";
import Stegsolve from "@/components/Stegsolve";

export default function StegPage() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type.startsWith("image/")) {
        setUploadedImage(file);
      } else {
        alert("Please upload a valid image file (PNG, JPEG, BMP, etc.)");
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".bmp", ".gif", ".webp"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const clearImage = () => {
    setUploadedImage(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Title Section */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="px-3 py-1 text-xs font-mono font-semibold tracking-wider text-lime-400 bg-lime-950/40 border border-lime-800/30 rounded-full uppercase">
              Steganography Suite
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mt-3 mb-4 tracking-tight">
              Bit Plane <span className="text-lime-400">Viewer</span>
            </h1>
            <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              Analyze color channels and extract hidden LSB (Least Significant Bit) data locally inside your browser. No server uploads required.
            </p>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {!uploadedImage ? (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="max-w-xl mx-auto"
            >
              <div
                {...getRootProps()}
                className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
                  isDragActive
                    ? "border-lime-500 bg-lime-500/5 shadow-[0_0_30px_rgba(132,204,22,0.15)]"
                    : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/40 hover:bg-zinc-900/60"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 bg-zinc-800/50 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="w-10 h-10 text-zinc-400 group-hover:text-lime-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-base text-zinc-200 font-semibold">
                      Drag & drop your image here, or{" "}
                      <span className="text-lime-400 group-hover:underline">browse</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-2 font-mono">
                      Supports PNG, JPG, JPEG, BMP, GIF, WEBP
                    </p>
                  </div>
                </div>
              </div>

              {/* Info panel */}
              <div className="mt-8 bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex gap-3 text-xs text-zinc-400">
                <HelpCircle className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-200 font-semibold">How it works:</span> Bit steganography hides data inside the least significant bits of image pixels. This browser-based tool isolates each of the 8 bit planes for the Red, Green, and Blue channels, allowing you to instantly visualize anomalies or hidden visual patterns without sending any data to a remote server.
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="viewer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* File Info & Reset Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-4 max-w-6xl mx-auto gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-lime-950/40 border border-lime-800/20 rounded-lg text-lime-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200 font-mono truncate max-w-[200px] sm:max-w-xs">
                      {uploadedImage.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {(uploadedImage.size / 1024).toFixed(1)} KB &nbsp;·&nbsp; {uploadedImage.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearImage}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-red-400 bg-zinc-800/50 hover:bg-red-500/10 border border-zinc-700/50 hover:border-red-500/20 rounded-lg transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear & Upload Another
                </button>
              </div>

              {/* Main Stegsolve component */}
              <Stegsolve file={uploadedImage} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}