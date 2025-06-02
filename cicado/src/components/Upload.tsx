// "use client";

// import Nav from "@/components/Nav";
// import { FileUpload } from "@/components/ui/file-upload";

// export default function Upload() {
//   const handleFileChange = (files: File[]) => {
//     console.log("Uploaded files:", files);
//   };

//   return (
//     <div className="min-h-screen bg-background">
//       <Nav />
//       <main className="container mx-auto mt-24 px-4 py-8">
//         <h1 className="text-4xl font-bold mb-4">
//           Upload Your Files
//         </h1>
//         <p className="text-lg mb-8">
//           Use the file uploader below to select or drag and drop your files.
//         </p>
//         <FileUpload onChange={handleFileChange} />
//       </main>
//     </div>
//   );
// }
"use client";

import { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import Nav from "@/components/Nav"; 

export default function Upload() {
  const handleFileChange = async (files: File[]) => {
    if (!files.length) return;

    const formData = new FormData();
    formData.append("file", files[0]); // Only handling one file for now

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.url) {
        alert(`File uploaded! S3 URL: ${data.url}`);
      } else {
        console.error(data);
        alert("Upload failed.");
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed due to network or server error.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto mt-24 px-4 py-8">
        <h1 className="text-4xl font-bold mb-4">Upload Your Files</h1>
        <p className="text-lg mb-8">
          Use the file uploader below to select or drag and drop your files.
        </p>
        <FileUpload onChange={handleFileChange} />
      </main>
    </div>
  );
}
