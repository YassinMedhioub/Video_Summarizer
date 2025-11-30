export interface AnalysisResult {
  transcript: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

export enum AnalysisStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface VideoFile {
  file: File;
  previewUrl: string;
  base64?: string;
}
