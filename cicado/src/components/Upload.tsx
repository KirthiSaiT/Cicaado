import { useState, useEffect } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import Nav from "@/components/Nav";

export default function Upload() {
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string; key?: string } | null>(null);
  const [fileUploadKey, setFileUploadKey] = useState(Date.now());
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);

  useEffect(() => {
    const lastFile = localStorage.getItem("lastUploadedFile");
    if (lastFile) {
      setUploadedFile(JSON.parse(lastFile));
    }
  }, []);

  const handleFileChange = async (files: File[]) => {
    if (!files.length) return;

    const formData = new FormData();
    formData.append("file", files[0]);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.url && data.key) {
        const uploaded = { name: files[0].name, url: data.url, key: data.key };
        setUploadedFile(uploaded);
        localStorage.setItem("lastUploadedFile", JSON.stringify(uploaded));
      } else {
        console.error(data);
        alert("Upload failed.");
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed due to network or server error.");
    }
  };

  const handleAnalysis = async () => {
    if (!uploadedFile?.key) return;
    setIsAnalysing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    try {
      const res = await fetch("/api/run-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: uploadedFile.key }),
      });
      const data = await res.json();
      if (res.ok) {
        let allResults = "";
        for (const toolName in data) {
          if (Object.prototype.hasOwnProperty.call(data, toolName)) {
            allResults += `--- ${toolName.toUpperCase()} ---\n${data[toolName]}\n\n`;
          }
        }
        setAnalysisResult(allResults);
      } else {
        setAnalysisError(data.error);
      }
    } catch (err) {
      console.error(err);
      setAnalysisError("Failed to run analysis.");
    }
    setIsAnalysing(false);
  };

  const isImage = (fileName: string) => /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);

  const getFileIcon = (fileName: string) => {
    if (isImage(fileName)) return "🖼️";
    if (/\.(pdf)$/i.test(fileName)) return "📄";
    if (/\.(doc|docx)$/i.test(fileName)) return "📝";
    if (/\.(xls|xlsx)$/i.test(fileName)) return "📊";
    if (/\.(zip|rar|7z)$/i.test(fileName)) return "📦";
    if (/\.(mp4|avi|mov|mkv)$/i.test(fileName)) return "🎬";
    if (/\.(mp3|wav|flac)$/i.test(fileName)) return "🎵";
    return "📁";
  };

  const getFileSizeDisplay = () => "Size: Unknown";

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    localStorage.removeItem("lastUploadedFile");
    setFileUploadKey(Date.now());
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto mt-24 px-4 py-8">
        <h1 className="text-4xl font-bold mb-4">Upload Your Files</h1>
        <p className="text-lg mb-8">Use the file uploader below to select or drag and drop your files.</p>

        <FileUpload key={fileUploadKey} onChange={handleFileChange} />

        {uploadedFile && (
          <div className="mt-8">
            <h2 className="text-white text-lg font-medium mb-4">Selected File:</h2>

            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 mb-2">
              <div className="flex items-center justify-between text-gray-300">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 text-gray-400">{getFileIcon(uploadedFile.name)}</div>
                  <span>{uploadedFile.name}</span>
                </div>
                <span className="text-sm text-gray-400">{getFileSizeDisplay()}</span>
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={clearUploadedFile}
              className="text-red-400 hover:text-red-600 text-sm mb-4"
            >
              ❌ Delete File
            </button>

            {/* Analysis Button */}
            <button
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors mb-4"
              onClick={handleAnalysis}
              disabled={isAnalysing}
            >
              {isAnalysing ? "Analysing..." : "Start Analysis"}
            </button>

            {/* Analysis Result */}
            {analysisResult && (
              <pre className="bg-black text-green-400 p-4 rounded overflow-x-auto max-h-96">
                {analysisResult}
              </pre>
            )}
            {analysisError && (
              <div className="text-red-500">{analysisError}</div>
            )}

            {/* Security Notice */}
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-3">
                <div className="text-amber-500 mt-0.5">⚠️</div>
                <div>
                  <h3 className="text-amber-400 font-medium mb-1">Security Notice:</h3>
                  <p className="text-gray-300 text-sm">
                    Files are processed in a secure sandbox environment. No data is stored permanently after analysis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
