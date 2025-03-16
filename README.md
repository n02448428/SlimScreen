SlimScreen

Work in Progress - SlimScreen is an AI-powered bookmarklet that lets you highlight text or (eventually) images on any webpage to get concise, librarian-style insights and save your conversations. Built for quick learning and exploration, it’s in active development with some features still being polished.
Features

    Text Highlighting: Ctrl + Shift + drag to select text → Get a warm, concise summary (~50 words) in a friendly librarian tone.
    Conversational Ask: Type questions in the overlay box → Keep chatting about your selection.
    Save Dialogue: Export your full conversation (highlight + questions + insights) as a .txt file (e.g., McGill_20250315_1430.txt).
    Toggle On/Off: Click the bookmarklet to enable/disable; overlay hides when off.

Installation

    Get a Hugging Face Token:
        Sign up at huggingface.co.
        Go to Settings → Tokens → Create a “Read” token (free!).
    Add the Bookmarklet:
        Visit https://n02448428.github.io/SlimScreen.
        Drag this bookmarklet to your toolbar:
        text

        javascript:(function(){if(!window.slimScreenLoaded){var s=document.createElement('script');s.src='https://n02448428.github.io/SlimScreen/slimscreen.js';s.onload=function(){window.slimScreenLoaded=true;window.slimScreenToggle();};document.body.appendChild(s);}else{window.slimScreenToggle();}})()
    First Use:
        Click the bookmarklet on any page → Enter your HF token when prompted → It’s saved in your browser for future use.

Usage

    Toggle: Click the bookmarklet (bottom-right toolbar shows “SlimScreen: On/Off”).
    Highlight: Ctrl + Shift + drag over text → Overlay pops up with an insight.
    Ask: Type in the box → Press Enter for follow-ups.
    Save: Click “Save” → Downloads your chat history.
    Drag Toolbar: Move the toggle bar anywhere on the page.

Current Status

SlimScreen is an MVP under active development. Here’s where we’re at:

    Working:
        Text highlighting and summaries (via EleutherAI/gpt-neo-125m).
        Conversational follow-ups.
        Saving full dialogue.
    Work in Progress:
        Image Capture: Highlighting images for OCR or analysis isn’t functional yet (html2canvas issues).
        Selection Alignment: Highlight box may be wonky on scrolled pages—needs refinement.
        CORS/503 Errors: Hugging Face API occasionally fails with “Cross-Origin Request Blocked” or “Service Unavailable” (503). Try locally or wait if this happens.

Troubleshooting

    CORS Error: “Cross-Origin Request Blocked” → Clear localStorage (F12 → Console → localStorage.clear()), re-enter token, or test locally:
    bash

    cd /path/to/SlimScreen
    python -m http.server 8000
    # Open http://localhost:8000
    503 Error: HF server busy → Wait a bit or retry. Fallback to distilbert-base-uncased may kick in.
    No Insights: Ensure your token is valid and not rate-limited (~30-50 requests/hour on free tier).
    Image Issues: Not working yet—stay tuned!

Development

    Clone Repo: git clone https://github.com/n02448428/SlimScreen.git
    Dependencies:
        html2canvas (CDN) for screenshots.
        Tesseract.js (CDN) for OCR (WIP).
    Edit Locally: Add your HF token in slimscreen.js for testing, but don’t commit it!
    Contribute: Fork, tweak, PR—help us fix image capture or CORS!

Roadmap

    Fix image capture and OCR.
    Stabilize selection tool alignment.
    Resolve CORS issues (possible proxy workaround).
    Enhance UI (e.g., prettier overlay).

License

MIT License - Feel free to use, modify, and share (just don’t commit tokens publicly!).
Contact

    Issues? Ideas? File a GitHub Issue.
    Built by n02448428 with ❤️ and AI.
