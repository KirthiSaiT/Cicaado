"use client";

import Nav from "@/components/Nav";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto mt-24 px-4 py-8">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to Startup
        </h1>
        <p className="text-lg">
          This is a sample page demonstrating the resizable navbar from Aceternity UI. Scroll down to see the navbar's behavior, and try resizing the window or toggling the mobile menu.
        </p>
        <div className="h-[200vh] mt-8">
          <p>
            Scroll down to see the navbar resize and apply backdrop blur.
          </p>
        </div>
      </main>
    </div>
  );
}