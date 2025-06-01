"use client";

import Nav from "@/components/Nav";
import Upload from "@/components/Upload";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Upload/>
    </div>
  );
}