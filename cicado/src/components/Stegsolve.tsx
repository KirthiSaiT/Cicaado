import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';

interface StegsolveProps {
  onAnalysisComplete?: (result: object) => void;
}

const Stegsolve: React.FC<StegsolveProps> = ({ onAnalysisComplete }) => {
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<object | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.bmp']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setImage(acceptedFiles[0]);
        await analyzeImage(acceptedFiles[0]);
      }
    }
  });

  const analyzeImage = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/stegsolve', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data: object = await response.json();
      setResult(data);
      onAnalysisComplete?.(data);
    } catch (error) {
      console.error('Error analyzing image:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-6"
      >
        <h2 className="text-2xl font-bold mb-4">Stegsolve Analysis</h2>
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
        >
          <input {...getInputProps()} />
          {image ? (
            <div className="space-y-2">
              <p className="text-gray-600">Selected: {image.name}</p>
              {loading ? (
                <p className="text-blue-500">Analyzing image...</p>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImage(null);
                    setResult(null);
                  }}
                  className="text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-600">
              {isDragActive
                ? 'Drop the image here'
                : 'Drag and drop an image here, or click to select'}
            </p>
          )}
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 space-y-4"
          >
            <h3 className="text-xl font-semibold">Analysis Results</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Stegsolve; 