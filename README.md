# SlimScreen AI

SlimScreen is an AI-powered bookmarklet that lets you highlight text or images on any webpage to get concise, librarian-style insights and save your conversations. Built for quick learning and exploration, it helps you understand content faster.

## Features

- **Text Highlighting**: Ctrl + Shift + drag to select text → Get a warm, concise summary in a friendly librarian tone
- **Image Analysis**: Experimental support for capturing and analyzing images from webpages
- **Conversational Interface**: Type questions in the overlay box → Keep chatting about your selection
- **Save Dialogue**: Export your full conversation (highlight + questions + insights) as a timestamped .txt file
- **Keyboard Shortcuts**: Toggle with Ctrl + Alt + S, highlight with Ctrl + Shift + drag
- **Privacy-Focused**: Your API token stays in your browser's localStorage

## Installation

1. **Get a Hugging Face Token**:
   - Sign up at [huggingface.co](https://huggingface.co)
   - Go to Settings → Tokens → Create a "Read" token (free!)

2. **Add the Bookmarklet**:
   - Visit [https://n02448428.github.io/SlimScreen](https://n02448428.github.io/SlimScreen)
   - Drag the SlimScreen button to your bookmarks toolbar
   
   Or create a bookmark manually with this code:
   ```
   javascript:(function(){if(!window.slimScreenLoaded){var s=document.createElement('script');s.src='https://n02448428.github.io/SlimScreen/slimscreen.js';s.onload=function(){window.slimScreenLoaded=true;window.slimScreenToggle();};document.body.appendChild(s);}else{window.slimScreenToggle();}})()
   ```

3. **First Use**:
   - Click the bookmarklet on any page
   - Enter your HF token when prompted
   - It's saved in your browser for future use

## Usage

- **Toggle**: Click the bookmarklet or press Ctrl + Alt + S
- **Highlight**: Ctrl + Shift + drag over text or an image
- **Get Insight**: An overlay appears with AI-generated summary
- **Ask**: Type in the box → Press Enter for follow-ups
- **Save**: Click "Save Dialogue" → Downloads your chat history
- **Move**: Drag the toolbar to reposition it anywhere on the page

## How It Works

SlimScreen uses the Hugging Face API to generate insights:

1. First tries EleutherAI/gpt-neo-125m for summaries
2. Falls back to distilbert-base-uncased or facebook/bart-large-cnn if needed
3. Uses Tesseract.js for OCR on captured images
4. Uses CLIP for image content analysis
5. Stores conversation history locally for saving

## Troubleshooting

- **Token Error**: "Please provide a Hugging Face token" → Clear localStorage (F12 → Console → `localStorage.clear()`), re-enter token
- **CORS Error**: "Cross-Origin Request Blocked" → Some sites restrict external scripts; try on a different site
- **API Errors**: HF server busy → The tool will automatically try fallback models
- **Image Issues**: Capturing images is experimental → Try selecting text instead
- **Selection Problems**: If highlight box looks wrong → Try again with a smaller selection

## Development

- **Clone Repo**: `git clone https://github.com/n02448428/SlimScreen.git`
- **Dependencies**:
  - html2canvas (CDN) for screenshots
  - Tesseract.js (CDN) for OCR
  - Hugging Face API for AI processing
- **Local Testing**: `python -m http.server 8000` and visit http://localhost:8000

## Roadmap

- Improve image capture and OCR reliability
- Add more AI models for better insights
- Enhance UI with better positioning and animations
- Create browser extension version
- Add support for highlighting multiple selections

## License

MIT License - Feel free to use, modify, and share.

## Contact

- Issues? Ideas? File a [GitHub Issue](https://github.com/n02448428/SlimScreen/issues)
- Built by [n02448428](https://github.com/n02448428)
