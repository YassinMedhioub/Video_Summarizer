import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { Copy, Check, AlignLeft, List, FileCog, Info, Download, Box, FileVideo, FileText, FileType } from 'lucide-react';
import { Button } from './Button';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

interface AnalysisViewProps {
  result: AnalysisResult;
  videoFile: File | null;
}

// --- Polyglot Logic Ported from 'beheader' script ---

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function padLeft(str: string, targetLen: number, padChar = "0") {
  return padChar.repeat(Math.max(0, targetLen - str.length)) + str;
}

function findSubArrayIndex(array: Uint8Array, subArray: Uint8Array, startIndex = 0) {
  for (let i = startIndex; i <= array.length - subArray.length; i++) {
    let match = true;
    for (let j = 0; j < subArray.length; j++) {
      if (array[i + j] !== subArray[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Patches PDF Cross-Reference (xref) table offsets.
 * Logic derived from 'beheader' script to allow PDF appending.
 */
const fixPdfOffsets = async (pdfBlob: Blob, offsetToAdd: number): Promise<Blob> => {
    const buffer = new Uint8Array(await pdfBlob.arrayBuffer());
    
    // Find Start of XREF table
    const xrefToken = encoder.encode("\nxref");
    const xrefStart = findSubArrayIndex(buffer, xrefToken) + 1;
    
    if (xrefStart <= 0) return pdfBlob; 

    // Find the first object offset (typically starts the list)
    const firstEntryToken = encoder.encode("\n0000000000");
    const offsetStart = findSubArrayIndex(buffer, firstEntryToken, xrefStart) + 1;
    
    // Find startxref location
    const startXrefToken = encoder.encode("\nstartxref");
    const startXrefStart = findSubArrayIndex(buffer, startXrefToken, xrefStart) + 1;
    const startXrefEnd = buffer.indexOf(0x0A, startXrefStart + 11);

    if (offsetStart <= 0 || startXrefStart <= 0 || startXrefEnd <= 0) return pdfBlob;

    try {
        // Read xref header to get entry count
        const xrefHeaderBytes = buffer.slice(xrefStart, offsetStart);
        const xrefHeaderStr = decoder.decode(xrefHeaderBytes);
        // Format: "xref \n 0 COUNT \n"
        const count = parseInt(xrefHeaderStr.trim().replace(/\n/g, " ").split(" ").pop() || "0", 10);

        let curr = offsetStart;
        for (let i = 0; i < count; i++) {
             // Entry format: "NNNNNNNNNN GGGGG n \n" (20 bytes)
             const lineBytes = buffer.slice(curr, curr + 10);
             const lineStr = decoder.decode(lineBytes);
             const oldOffset = parseInt(lineStr.trim(), 10);
             
             // Script logic: blindly update all offsets in the table
             const newOffset = oldOffset + offsetToAdd;
             const newOffsetStr = padLeft(newOffset.toString(), 10).slice(0, 10);
             buffer.set(encoder.encode(newOffsetStr), curr);
             
             // Move to next line (find next newline)
             curr = buffer.indexOf(0x0A, curr + 1) + 1;
        }

        // Adjust 'startxref' pointer to point to the new location of the xref table
        const oldStartXrefBytes = buffer.slice(startXrefStart + 10, startXrefEnd);
        const oldStartXref = parseInt(decoder.decode(oldStartXrefBytes).trim(), 10);
        const newStartXref = oldStartXref + offsetToAdd;
        const newStartXrefStr = newStartXref.toString();
        
        buffer.set(encoder.encode(newStartXrefStr), startXrefStart + 10);
        
        // Ensure EOF is valid after modification
        buffer.set(encoder.encode("\n%%EOF\n"), startXrefStart + 10 + newStartXrefStr.length);

    } catch (e) {
        console.warn("PDF Patching failed", e);
        return pdfBlob;
    }

    return new Blob([buffer], { type: 'application/pdf' });
};

/**
 * Patches ZIP Central Directory offsets.
 * Logic mimics 'zip -A' command referenced in the script.
 */
const fixZipOffsets = async (zipBlob: Blob, offsetToAdd: number): Promise<Blob> => {
    const buffer = await zipBlob.arrayBuffer();
    const view = new DataView(buffer);
    
    // Find End of Central Directory (EOCD) Record
    // Signature: 0x06054b50
    let eocdPos = -1;
    const scanLen = Math.min(buffer.byteLength, 65535 + 22);
    for (let i = buffer.byteLength - 22; i >= buffer.byteLength - scanLen; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdPos = i;
        break;
      }
    }

    if (eocdPos === -1) return zipBlob;

    // Update 'Offset of start of central directory'
    const cdOffset = view.getUint32(eocdPos + 16, true);
    view.setUint32(eocdPos + 16, cdOffset + offsetToAdd, true);

    const cdCount = view.getUint16(eocdPos + 10, true);
    let currentPos = cdOffset;
    
    // Update local header offsets for each file
    for (let i = 0; i < cdCount; i++) {
       if (currentPos + 4 > buffer.byteLength || view.getUint32(currentPos, true) !== 0x02014b50) break;

       const localHeaderOffset = view.getUint32(currentPos + 42, true);
       view.setUint32(currentPos + 42, localHeaderOffset + offsetToAdd, true);

       const fileNameLen = view.getUint16(currentPos + 28, true);
       const extraFieldLen = view.getUint16(currentPos + 30, true);
       const commentLen = view.getUint16(currentPos + 32, true);

       currentPos += 46 + fileNameLen + extraFieldLen + commentLen;
    }

    return new Blob([buffer], { type: 'application/zip' });
};

// --- End of Polyglot Logic ---

export const AnalysisView: React.FC<AnalysisViewProps> = ({ result, videoFile }) => {
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('summary');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCopy = () => {
    const text = activeTab === 'transcript' ? result.transcript : result.summary;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPolyglot = async () => {
    if (!videoFile) return;
    setIsDownloading(true);

    try {
        const videoSize = videoFile.size;

        // 1. Generate PDF
        const doc = new jsPDF();
        doc.setFontSize(22); doc.text("VideoMind Analysis Report", 20, 20);
        doc.setFontSize(10); doc.setTextColor(100); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
        doc.line(20, 35, 190, 35);
        
        doc.setFontSize(14); doc.setTextColor(0); doc.text("Summary", 20, 50);
        doc.setFontSize(11); doc.setTextColor(60); 
        const summaryLines = doc.splitTextToSize(result.summary, 170);
        doc.text(summaryLines, 20, 60);
        
        let y = 60 + (summaryLines.length * 5) + 10;
        doc.setFontSize(14); doc.setTextColor(0); doc.text("Transcript", 20, y);
        doc.setFontSize(10); doc.setTextColor(60);
        const transcriptLines = doc.splitTextToSize(result.transcript.substring(0, 3000) + "...", 170);
        doc.text(transcriptLines, 20, y + 10);
        
        const rawPdfBlob = doc.output('blob');

        // 2. Patch PDF Offsets (so it works when appended after video)
        const patchedPdfBlob = await fixPdfOffsets(rawPdfBlob, videoSize);
        const pdfSize = patchedPdfBlob.size;

        // 3. Generate ZIP containing clean files
        const zip = new JSZip();
        zip.file("report.pdf", rawPdfBlob); // Clean PDF inside ZIP
        zip.file("transcript.txt", result.transcript);
        zip.file("summary.md", result.summary);
        const rawZipBlob = await zip.generateAsync({ type: 'blob' });

        // 4. Patch ZIP Offsets (so it works when appended after video + pdf)
        // Offset = Video Size + PDF Size
        const patchedZipBlob = await fixZipOffsets(rawZipBlob, videoSize + pdfSize);

        // 5. Concatenate: [Video] + [Patched PDF] + [Patched ZIP]
        const combinedBlob = new Blob([videoFile, patchedPdfBlob, patchedZipBlob], { type: videoFile.type });

        // Download
        const originalExt = videoFile.name.split('.').pop() || 'mp4';
        const filename = `videomind_universal.${originalExt}`;
        
        const url = URL.createObjectURL(combinedBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Polyglot generation failed", e);
        alert("Failed to generate file. See console.");
    }
    setIsDownloading(false);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      {/* Header / Stats */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center space-x-2">
           <span className={`px-3 py-1 rounded-full text-sm font-semibold 
             ${result.sentiment === 'Positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
               result.sentiment === 'Negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
               'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
             {result.sentiment} Sentiment
           </span>
        </div>
        
        <div className="flex flex-col items-end">
            <Button 
                variant="primary" 
                size="sm" 
                onClick={handleDownloadPolyglot}
                isLoading={isDownloading}
                className="shadow-none bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
            >
                <FileCog className="w-4 h-4 mr-2" />
                Download Polyglot File
            </Button>
            <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex space-x-3 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
               <div className="flex items-center" title="Default: Video">
                  <FileVideo className="w-3 h-3 mr-1 opacity-70"/> 
                  <span>.{videoFile?.name.split('.').pop() || 'mp4'}</span>
               </div>
               <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 self-center"></div>
               <div className="flex items-center text-blue-600 dark:text-blue-400" title="Rename to .zip for data">
                  <Box className="w-3 h-3 mr-1 opacity-70"/> 
                  <span className="font-bold">.zip</span>
               </div>
               <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 self-center"></div>
               <div className="flex items-center opacity-60" title="Rename to .pdf (Experimental)">
                  <FileType className="w-3 h-3 mr-1"/> 
                  <span>.pdf</span>
               </div>
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 
            ${activeTab === 'summary' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
          <div className="flex items-center justify-center">
            <AlignLeft className="w-4 h-4 mr-2" />
            Summary & Key Points
          </div>
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 
            ${activeTab === 'transcript' 
              ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
        >
          <div className="flex items-center justify-center">
            <List className="w-4 h-4 mr-2" />
            Full Transcript
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="relative p-6 min-h-[400px]">
        <div className="absolute top-6 right-6 z-10">
          <button 
            onClick={handleCopy}
            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {activeTab === 'summary' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Executive Summary</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {result.summary}
              </p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Key Takeaways
              </h4>
              <ul className="space-y-2">
                {result.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start text-slate-700 dark:text-slate-300">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 mr-3" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="prose dark:prose-invert max-w-none">
               <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                {result.transcript}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};