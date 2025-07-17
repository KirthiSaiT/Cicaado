import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface RGBChannel {
  red: number[][];
  green: number[][];
  blue: number[][];
}

interface BitPlane {
  plane: number;
  red: number[][];
  green: number[][];
  blue: number[][];
}

interface AnalysisResult {
  filename: string;
  dimensions: { width: number; height: number };
  rgbChannels: RGBChannel;
  bitPlanes: BitPlane[];
  lsbAnalysis: {
    red: number[][];
    green: number[][];
    blue: number[][];
  };
  timestamp: string;
}

interface StegsolveProps {
  file: File;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

const Stegsolve: React.FC<StegsolveProps> = ({ file, onAnalysisComplete }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'red' | 'green' | 'blue'>('red');
  const [selectedBitPlane, setSelectedBitPlane] = useState<number>(0);
  const [showLSB, setShowLSB] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (file) {
      analyzeImage(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

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

      const data: AnalysisResult = await response.json();
      setResult(data);
      onAnalysisComplete?.(data);
    } catch (error) {
      console.error('Error analyzing image:', error);
    } finally {
      setLoading(false);
    }
  };

  const drawChannel = (channelData: number[][], canvas: HTMLCanvasElement, color: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = result!.dimensions;
    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const value = channelData[y][x];
        
        if (color === 'red') {
          data[index] = value;     // R
          data[index + 1] = 0;     // G
          data[index + 2] = 0;     // B
        } else if (color === 'green') {
          data[index] = 0;         // R
          data[index + 1] = value; // G
          data[index + 2] = 0;     // B
        } else if (color === 'blue') {
          data[index] = 0;         // R
          data[index + 1] = 0;     // G
          data[index + 2] = value; // B
        }
        data[index + 3] = 255;     // A
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const drawBitPlane = (bitPlaneData: number[][], canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = result!.dimensions;
    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const value = bitPlaneData[y][x] * 255; // Convert 0/1 to 0/255
        
        data[index] = value;     // R
        data[index + 1] = value; // G
        data[index + 2] = value; // B
        data[index + 3] = 255;   // A
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  useEffect(() => {
    if (result && canvasRef.current) {
      const canvas = canvasRef.current;
      
      if (showLSB) {
        // Show LSB analysis
        const lsbData = result.lsbAnalysis[selectedChannel];
        drawBitPlane(lsbData, canvas);
      } else {
        // Show RGB channel
        const channelData = result.rgbChannels[selectedChannel];
        drawChannel(channelData, canvas, selectedChannel);
      }
    }
  }, [result, selectedChannel, showLSB]);

  if (!file) return null;

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-6"
      >
        <h2 className="text-2xl font-bold mb-4">Steganography Analysis</h2>
        <div className="mb-4 text-gray-700">
          <span className="font-semibold">Selected Image:</span> {file.name}
        </div>
        {loading && <p className="text-blue-500">Analyzing image...</p>}
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Analysis Controls */}
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm font-medium mb-1">Channel:</label>
                <select
                  title="Select channel"
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value as 'red' | 'green' | 'blue')}
                  className="border rounded px-3 py-1"
                >
                  <option value="red">Red Channel</option>
                  <option value="green">Green Channel</option>
                  <option value="blue">Blue Channel</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Bit Plane:</label>
                <select
                  title="Select bit plane"
                  value={selectedBitPlane}
                  onChange={(e) => setSelectedBitPlane(Number(e.target.value))}
                  className="border rounded px-3 py-1"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(bit => (
                    <option key={bit} value={bit}>Bit {bit}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showLSB"
                  checked={showLSB}
                  onChange={(e) => setShowLSB(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="showLSB" className="text-sm">Show LSB Analysis</label>
              </div>
            </div>

            {/* Image Analysis Display */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Channel Visualization */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Channel Analysis</h3>
                <div className="border rounded-lg p-4">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-64 border rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>Dimensions: {result.dimensions.width} x {result.dimensions.height}</p>
                  <p>Analysis Time: {new Date(result.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Bit Plane Grid */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Bit Plane Analysis</h3>
              <div className="grid grid-cols-4 gap-4">
                {result.bitPlanes.map((bitPlane) => (
                  <div key={bitPlane.plane} className="border rounded p-2">
                    <h4 className="text-sm font-medium mb-2">Bit Plane {bitPlane.plane}</h4>
                    <div className="space-y-1">
                      <div className="text-xs">
                        <span className="text-red-500">Red:</span> {bitPlane.red.flat().filter(x => x === 1).length} ones
                      </div>
                      <div className="text-xs">
                        <span className="text-green-500">Green:</span> {bitPlane.green.flat().filter(x => x === 1).length} ones
                      </div>
                      <div className="text-xs">
                        <span className="text-blue-500">Blue:</span> {bitPlane.blue.flat().filter(x => x === 1).length} ones
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Stegsolve; 