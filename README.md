# VideoMind AI 🧠🎥

**Next-generation video intelligence tool powered by Google Gemini 2.5.**

VideoMind AI is a modern React application that leverages the multimodal capabilities of Google's Gemini 2.5 Flash model to instantly analyze video content. It extracts verbatim transcripts, generates executive summaries, creates key takeaways, and analyzes sentiment—all entirely in the browser.

![VideoMind AI Preview](https://via.placeholder.com/800x450.png?text=VideoMind+AI+Dashboard)

## ✨ Key Features

- **⚡ Instant Analysis**: Drag and drop any video file to get immediate insights.
- **📝 Verbatim Transcription**: Accurate speech-to-text extraction using Gemini's native audio understanding.
- **📊 Smart Summarization**: Abstractive summaries that capture the essence of the content.
- **🎯 Key Takeaways**: Bullet-point highlights of the most important information.
- **😊 Sentiment Analysis**: Detects the emotional tone of the video (Positive, Neutral, Negative).
- **🪄 Polyglot "Magic" File**: Download a single universal file that functions as:
  - A **Video** (MP4) when played in a media player.
  - A **ZIP Archive** (containing PDF reports & transcripts) when renamed to `.zip`.
  - A **PDF Document** (experimental) when renamed to `.pdf`.

## 🚀 How It Works

1. **Upload**: Select a video file (MP4, WebM, MOV, etc.).
2. **Process**: The app converts the video to a base64 stream and sends it to the **Gemini 2.5 Flash** model via the Google GenAI SDK.
3. **Analyze**: Gemini processes the visual and audio data simultaneously to generate structured JSON output.
4. **Export**: The app generates a PDF report and bundles it with the original video using advanced binary offset patching (Polyglot injection), creating a single file that works in multiple formats.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI Model**: Google Gemini 2.5 Flash (`@google/genai`)
- **Icons**: Lucide React
- **Utilities**: 
  - `jspdf` for PDF generation
  - `jszip` for client-side archiving

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/videomind-ai.git
   cd videomind-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory and add your Google Gemini API key:
   ```env
   API_KEY=your_google_ai_studio_api_key
   ```
   > Get your API key at [aistudio.google.com](https://aistudio.google.com/)

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 🖼️ Screenshots

### Analysis Dashboard
The main view providing the summary, sentiment, and key points immediately after processing.
![Dashboard](https://via.placeholder.com/600x340.png?text=Analysis+Dashboard)

### Full Transcript View
Read the complete generated transcript with formatted text.
![Transcript](https://via.placeholder.com/600x340.png?text=Transcript+View)

### The "Magic" Polyglot File
One file, multiple formats.
![Polyglot File](https://via.placeholder.com/600x340.png?text=Polyglot+File+Explanation)

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
