import React, { useState } from 'react';
import { VideoUploader } from './components/VideoUploader';
import { AnalysisView } from './components/AnalysisView';
import { Button } from './components/Button';
import { analyzeVideo } from './services/geminiService';
import { AnalysisResult, VideoFile, AnalysisStatus } from './types';
import { Bot, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileToBlob = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g. "data:video/mp4;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setCurrentVideo({ file, previewUrl });
    setStatus(AnalysisStatus.UPLOADING);
    setError(null);
    setResult(null);

    try {
      // 1. Prepare file
      const base64 = await fileToBlob(file);
      
      setStatus(AnalysisStatus.PROCESSING);
      
      // 2. Call Gemini
      const analysisResult = await analyzeVideo(base64, file.type);
      
      setResult(analysisResult);
      setStatus(AnalysisStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during processing.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleReset = () => {
    if (currentVideo) {
      URL.revokeObjectURL(currentVideo.previewUrl);
    }
    setCurrentVideo(null);
    setResult(null);
    setStatus(AnalysisStatus.IDLE);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Header */}
        <header className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-xl shadow-blue-500/10 mb-4">
            <div className="bg-blue-600 rounded-xl p-2 mr-3">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 tracking-tight">
              VideoMind AI
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Upload any video to extract verbatim transcripts, generate executive summaries, and analyze sentiment using 
            <span className="font-semibold text-blue-600 dark:text-blue-400 mx-1">Gemini 2.5 Flash</span>.
          </p>
        </header>

        {/* Main Content */}
        <main className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input & Video Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              
              {!currentVideo ? (
                <VideoUploader 
                  onFileSelect={handleFileSelect} 
                  isProcessing={status === AnalysisStatus.PROCESSING || status === AnalysisStatus.UPLOADING} 
                />
              ) : (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-lg">
                    <video 
                      src={currentVideo.previewUrl} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="truncate pr-4">
                      <p className="font-medium truncate text-sm">{currentVideo.file.name}</p>
                      <p className="text-xs text-slate-500">{(currentVideo.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleReset}
                      disabled={status === AnalysisStatus.PROCESSING}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      New File
                    </Button>
                  </div>
                </div>
              )}

              {/* Status Indicators */}
              {status === AnalysisStatus.PROCESSING && (
                <div className="mt-6 p-6 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex flex-col items-center text-center space-y-3 animate-pulse">
                  <Sparkles className="w-8 h-8 text-blue-600 animate-spin-slow" />
                  <div>
                    <h3 className="font-semibold text-blue-700 dark:text-blue-400">Analyzing Content</h3>
                    <p className="text-sm text-blue-600/80 dark:text-blue-400/80">Extracting audio, transcribing, and summarizing...</p>
                  </div>
                </div>
              )}

              {status === AnalysisStatus.ERROR && error && (
                <div className="mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700 dark:text-red-400">
                    <span className="font-semibold block mb-1">Analysis Failed</span>
                    {error}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
             {result ? (
               <AnalysisView 
                  result={result} 
                  videoFile={currentVideo?.file || null}
               />
             ) : (
               <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 bg-white/50 dark:bg-slate-900/50">
                 <div className="max-w-xs space-y-4">
                   <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
                     <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                   </div>
                   <h3 className="text-lg font-medium text-slate-900 dark:text-white">Ready to Process</h3>
                   <p className="text-sm text-slate-500">
                     Upload a video to see the AI-generated transcript, summary, and insights here.
                   </p>
                 </div>
               </div>
             )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;