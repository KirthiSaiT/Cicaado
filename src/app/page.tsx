"use client";

import Nav from "@/components/Nav";
import Upload from "@/components/Upload";
import {Button} from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Upload/>
      <Button>Start Analysis</Button>
    </div>
  );
}