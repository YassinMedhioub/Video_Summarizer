import React, { useCallback, useState } from 'react';
import { UploadCloud, FileVideo, AlertCircle, X } from 'lucide-react';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../constants';
import { Button } from './Button';

interface VideoUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateAndPassFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('video/')) {
      setError("Please upload a valid video file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds the ${MAX_FILE_SIZE_MB}MB limit for this browser-based demo.`);
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={`relative group rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out p-12 text-center
          ${dragActive 
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
            : "border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-800 bg-white/50 dark:bg-slate-900/50"
          }
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={handleChange}
          accept="video/*"
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
          <div className={`p-4 rounded-full bg-slate-100 dark:bg-slate-800 transition-transform duration-300 ${dragActive ? 'scale-110' : ''}`}>
            {dragActive ? (
              <UploadCloud className="w-10 h-10 text-blue-500" />
            ) : (
              <FileVideo className="w-10 h-10 text-slate-400" />
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {dragActive ? "Drop your video here" : "Upload Video"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Drag & drop or click to browse
            </p>
          </div>
          
          <div className="text-xs font-medium text-slate-400 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">
            Max size: {MAX_FILE_SIZE_MB}MB
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto hover:text-red-800 dark:hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
