"use client";

import Upload from "@/components/Upload";
import Stegsolve from "@/components/Stegsolve";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Upload
        onImageUpload={(file) => {
          setUploadedImage(file);
        }}
      />
      {uploadedImage && (
        <Stegsolve file={uploadedImage} />
      )}
      <Button>Start Analysis</Button>
    </div>
  );
}