"use client";

import Nav from "@/components/Nav";
import { FileUpload } from "@/components/ui/file-upload";

export default function Upload() {
  const handleFileChange = (files: File[]) => {
    console.log("Uploaded files:", files);
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto mt-24 px-4 py-8">
        <h1 className="text-4xl font-bold mb-4">
          Upload Your Files
        </h1>
        <p className="text-lg mb-8">
          Use the file uploader below to select or drag and drop your files.
        </p>
        <FileUpload onChange={handleFileChange} />
      </main>
    </div>
  );
}