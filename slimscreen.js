// Using an immediately-invoked async function expression
(async () => {
  // Run online inference by sending the payload to your Vercel proxy
  async function runOnlineInference(text) {
    try {
      const response = await fetch('https://slim-screen.vercel.app/api/infer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Note: Payload key changed from "text" to "inputs"
        body: JSON.stringify({ inputs: text })
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Online inference error:", error);
      return { error: "Online inference failed" };
    }
  }

  // Offline inference using Transformers.js pipeline
  let summarizer = null;

  async function loadLocalModel() {
    try {
      // Import the pipeline function from the transformers library
      // Since we're in a module, we can import it directly:
      const { pipeline } = await import('@xenova/transformers');
      summarizer = await pipeline('summarization', 'sshleifer/distilbart-cnn-12-6');
    } catch (error) {
      console.error("Error loading local model:", error);
    }
  }

  async function runLocalInference(text) {
    try {
      if (!summarizer) {
        await loadLocalModel();
      }
      const output = await summarizer(text);
      return output;
    } catch (error) {
      console.error("Local inference error:", error);
      return { error: "Local inference failed" };
    }
  }

  // Decide which inference mode to use based on connectivity
  async function getInsight(text) {
    if (navigator.onLine) {
      console.log("Online mode detected. Running online inference.");
      return await runOnlineInference(text);
    } else {
      console.log("Offline mode detected. Running local inference.");
      return await runLocalInference(text);
    }
  }

  // Display the result in the overlay
  function displayInsight(result) {
    const overlay = document.getElementById('insight-overlay');
    let content = "";
    
    if (result.error) {
      content = `<p>Error: ${result.error}</p>`;
    } else {
      if (Array.isArray(result)) {
        content = `<p>${result[0].summary || JSON.stringify(result)}</p>`;
      } else if (result.summary) {
        content = `<p>${result.summary}</p>`;
      } else {
        content = `<p>${JSON.stringify(result)}</p>`;
      }
    }
    
    overlay.innerHTML = content;
    overlay.style.display = 'block';
    
    // Automatically hide overlay after 10 seconds
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 10000);
  }

  // Listen for the hotkey: Ctrl + Shift + X
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        const result = await getInsight(selectedText);
        displayInsight(result);
      } else {
        console.log("No text selected.");
      }
    }
  });
})();
