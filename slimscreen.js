// Immediately-invoked function to isolate our scope
(function() {
  // --- Draggable Widget Setup ---
  const widget = document.getElementById('librarian-widget');
  const header = document.getElementById('widget-header');
  let isDragging = false, offsetX, offsetY;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - widget.offsetLeft;
    offsetY = e.clientY - widget.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      widget.style.left = (e.clientX - offsetX) + 'px';
      widget.style.top = (e.clientY - offsetY) + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // --- Widget Close Button ---
  document.getElementById('widget-close').addEventListener('click', () => {
    widget.style.display = 'none';
    updateBookmarkletText("Off");
  });

  // --- Bookmarklet Toggle Function ---
  window.slimScreenToggle = function() {
    if (widget.style.display === 'none' || widget.style.display === '') {
      widget.style.display = 'block';
      updateBookmarkletText("On");
    } else {
      widget.style.display = 'none';
      updateBookmarkletText("Off");
    }
  };

  function updateBookmarkletText(state) {
    const bm = document.getElementById('bookmarklet');
    if (bm) {
      bm.textContent = `SlimScreen: ${state}`;
    }
  }

  // --- Conversation Handling ---
  let conversationHistory = [];

  function appendMessage(sender, text) {
    conversationHistory.push({ sender, text });
    const convDiv = document.getElementById('conversation');
    const msg = document.createElement('div');
    msg.textContent = `${sender}: ${text}`;
    convDiv.appendChild(msg);
    convDiv.scrollTop = convDiv.scrollHeight;
  }

  // --- Copy Conversation ---
  document.getElementById('copy-conversation').addEventListener('click', () => {
    const allText = conversationHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
    navigator.clipboard.writeText(allText).then(() => alert('Conversation copied to clipboard!'));
  });

  // --- Save Conversation ---
  document.getElementById('save-conversation').addEventListener('click', () => {
    const allText = conversationHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
    const blob = new Blob([allText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversation.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // --- Online Inference Function ---
  async function runOnlineInference(text) {
    // Construct a prompt to instruct the model with a friendly librarian tone.
    const prompt = "You are a friendly, polite female librarian who provides clear definitions, context, and insights. Never use bad words. Answer kindly: " + text;
    try {
      const response = await fetch('https://slim-screen.vercel.app/api/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt })
      });
      const result = await response.json();
      if (!response.ok) {
        // If the API returned an error, throw it to be caught below.
        throw new Error(result.error || "Network response was not ok");
      }
      return result;
    } catch (error) {
      console.error("Online inference error:", error);
      return { error: error.message };
    }
  }

  // --- Hotkey for Highlighted Text (Ctrl+Shift+X) ---
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        appendMessage('User', selectedText);
        const result = await runOnlineInference(selectedText);
        if (result.error) {
          appendMessage('Librarian', result.error);
        } else if (Array.isArray(result) && result[0].generated_text) {
          appendMessage('Librarian', result[0].generated_text);
        } else if (result.generated_text) {
          appendMessage('Librarian', result.generated_text);
        } else {
          appendMessage('Librarian', JSON.stringify(result));
        }
      } else {
        alert('No text selected!');
      }
    }
  });

  // --- Handle Follow-Up Questions via Input Field ---
  const userInput = document.getElementById('user-input');
  userInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      const query = userInput.value.trim();
      if (query) {
        appendMessage('User', query);
        userInput.value = '';
        const result = await runOnlineInference(query);
        if (result.error) {
          appendMessage('Librarian', result.error);
        } else if (Array.isArray(result) && result[0].generated_text) {
          appendMessage('Librarian', result[0].generated_text);
        } else if (result.generated_text) {
          appendMessage('Librarian', result.generated_text);
        } else {
          appendMessage('Librarian', JSON.stringify(result));
        }
      }
    }
  });
})();
