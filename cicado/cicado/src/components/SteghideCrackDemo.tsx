import React from 'react';

interface SteghideCrackResult {
  password_found: boolean;
  password: string | null;
  extracted_data: string | null;
  message: string;
}

interface SteghideCrackDemoProps {
  result: SteghideCrackResult;
}

const SteghideCrackDemo: React.FC<SteghideCrackDemoProps> = ({ result }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-lg">
      <h3 className="text-lime-400 text-xl font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
        Steghide Password Crack
      </h3>
      
      {result.password_found ? (
        <div className="space-y-4">
          <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
            <h4 className="text-green-400 font-bold mb-2">✅ Password Found!</h4>
            <p className="text-green-300">Password: <span className="font-mono bg-zinc-800 px-2 py-1 rounded">{result.password}</span></p>
          </div>
          
          <div>
            <h4 className="text-lime-400 font-bold mb-2">Extracted Data:</h4>
            <pre className="text-green-300 whitespace-pre-wrap max-h-60 overflow-y-auto text-sm bg-black/80 rounded p-4">
              {result.extracted_data}
            </pre>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg">
          <h4 className="text-amber-400 font-bold mb-2">⚠️ No Password Found</h4>
          <p className="text-amber-300">{result.message}</p>
        </div>
      )}
    </div>
  );
};

export default SteghideCrackDemo;