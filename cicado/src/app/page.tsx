"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10 max-w-3xl px-4"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight">
          Welcome to <span className="text-lime-400">Cicaado</span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          The ultimate platform for steganography analysis, forensics, and OSINT reconnaissance. Upload files, uncover hidden data, and crack passwords instantly.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
          <Link href="/forensics">
            <Button size="lg" className="bg-lime-500 hover:bg-lime-600 text-black font-bold text-base px-6 py-5 w-full sm:w-auto transition-all shadow-[0_0_20px_rgba(132,204,22,0.3)] hover:shadow-[0_0_30px_rgba(132,204,22,0.5)]">
              Launch Forensics Suite
            </Button>
          </Link>
          <Link href="/steg">
            <Button size="lg" variant="outline" className="text-base px-6 py-5 w-full sm:w-auto border-lime-500/50 hover:bg-lime-500/10 text-lime-400 transition-all">
              Open Stegsolve
            </Button>
          </Link>
          <Link href="/cheatsheet">
            <Button size="lg" variant="outline" className="text-base px-6 py-5 w-full sm:w-auto border-zinc-700 hover:bg-zinc-800 transition-all">
              View Cheatsheets
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
