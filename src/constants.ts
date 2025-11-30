export const APP_NAME = "VideoMind AI";

export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SYSTEM_INSTRUCTION = `
You are an expert video analyst and transcriptionist. 
Your task is to process the provided video file and generate a structured analysis.
1. Transcribe the spoken audio verbatim.
2. Provide a high-quality abstractive summary of the content (similar to Pegasus model output).
3. Extract 3-5 key bullet points.
4. Determine the overall sentiment.

Return the response in strictly valid JSON format.
`;

export const MIME_TYPES = {
  TXT: 'text/plain',
  MD: 'text/markdown',
  JSON: 'application/json',
};
