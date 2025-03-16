# SlimScreen AI

SlimScreen AI is an elegant, hybrid AI-powered tool designed to provide contextual insights on highlighted text (and, experimentally, images) directly on your screen. With a friendly, librarian-like interface, it works seamlessly in both online and offline modes.

## Features

- **Hybrid Inference Modes:**
  - **Online Mode:** When connected, a secure serverless proxy (deployed on Vercel) leverages the Hugging Face API for fast, efficient inference.
  - **Offline Mode:** When offline, the tool uses [Transformers.js](https://xenova.github.io/transformers.js/) to run a lightweight summarization model directly in the browser.
- **User-Friendly Interface:** Highlight text and press `Ctrl + Shift + X` (customizable) to get AI-powered insights in a sleek overlay.
- **Privacy & Security:** Your API token is safely stored on the server—never exposed to the client. Offline mode ensures a self-contained, independent experience.
- **Lightweight & Modular:** Designed to keep the overall footprint under 200MB, ensuring performance even on older machines.

## Getting Started

### Prerequisites

- **Node.js and npm:**  
  [Download Node.js](https://nodejs.org) (which includes npm). This is essential for running local tools and the Vercel CLI.
- **Vercel CLI:**  
  Install globally using:
  ```bash
  npm install -g vercel
