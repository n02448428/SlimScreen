// Immediately-invoked function to isolate our scope
(function() {
  // --- Widget Injection for Any Page ---
  function ensureWidget() {
    let widget = document.getElementById('librarian-widget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'librarian-widget';
      widget.style.position = 'fixed';
      widget.style.top = '10px';
      widget.style.left = '10px';
      widget.style.width = '300px';
      widget.style.background = '#fff';
      widget.style.border = '1px solid #ccc';
      widget.style.borderRadius = '8px';
      widget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
      widget.style.zIndex = '9999';
      widget.style.fontFamily = 'sans-serif';
      widget.style.transition = 'width 0.3s, height 0.3s';
      widget.style.display = 'none';
      widget.innerHTML = `
        <div id="widget-header" style="cursor: move; padding: 10px; background: #f7f7f7; border-bottom: 1px solid #ccc;">
          <strong>Librarian</strong>
          <button id="widget-close" style="float: right;">X</button>
        </div>
        <div id="conversation" style="max-height: 200px; overflow-y: auto; padding: 10px; font-size: 0.9em;"></div>
        <input id="user-input" type="text" placeholder="Ask me anything..." style="width: calc(100% - 20px); margin: 10px; padding: 5px;" />
        <div id="widget-buttons" style="padding: 0 10px 10px;">
          <button id="copy-conversation">Copy Conversation</button>
          <button id="save-conversation">Save Conversation</button>
        </div>
      `;
      document.body.appendChild(widget);
      setupWidget(widget);
    }
    return widget;
  }

  // --- Setup Widget Events (Draggable, Close, etc.) ---
  function setupWidget(widget) {
    const header = widget.querySelector('#widget-header');
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
    widget.querySelector('#widget-close').addEventListener('click', () => {
      widget.style.display = 'none';
      updateBookmarkletText("Off");
    });
    setupCopySave(widget);
    setupInputHandler(widget);
  }

  // --- Setup Copy/Save Functions ---
  let conversationHistory = [];
  function setupCopySave(widget) {
    const copyBtn = widget.querySelector('#copy-conversation');
    const saveBtn = widget.querySelector('#save-conversation');
    
    copyBtn.addEventListener('click', () => {
      if (conversationHistory.length === 0) {
        alert('No conversation to copy.');
        return;
      }
      const allText = conversationHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
      
      // Fix for clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = allText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          alert('Conversation copied to clipboard!');
        } else {
          alert('Failed to copy conversation. Your browser may not support this feature.');
        }
      } catch (err) {
        alert('Error copying to clipboard: ' + err);
      }
      
      document.body.removeChild(textArea);
    });
    
    saveBtn.addEventListener('click', () => {
      if (conversationHistory.length === 0) {
        alert('No conversation to save.');
        return;
      }
      const allText = conversationHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
      const blob = new Blob([allText], { type: 'text/plain' });
      
      // Create download link and trigger it
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = 'conversation-' + new Date().toISOString().slice(0,10) + '.txt';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    });
  }

  // --- Setup Input Field for Follow-Up Questions ---
  function setupInputHandler(widget) {
    const userInput = widget.querySelector('#user-input');
    
    // Fix for Enter key press handling
    userInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent default to ensure handling
        const query = userInput.value.trim();
        if (query) {
          appendMessage('User', query);
          userInput.value = '';
          userInput.disabled = true; // Disable input while processing
          
          // Show loading message
          const loadingId = showLoading();
          
          try {
            const result = await runInference(query);
            // Remove loading message
            removeLoading(loadingId);
            handleResult(result);
          } catch (error) {
            // Remove loading message and show error
            removeLoading(loadingId);
            appendMessage('Librarian', `Sorry, I encountered an error: ${error.message || "Unknown error"}`);
          } finally {
            userInput.disabled = false; // Re-enable input
            userInput.focus(); // Return focus to input field
          }
        }
      }
    });
  }

  // --- Loading Indicator ---
  function showLoading() {
    const id = 'loading-' + Date.now();
    const convDiv = document.getElementById('conversation');
    if (convDiv) {
      const msg = document.createElement('div');
      msg.id = id;
      msg.textContent = 'Librarian: Looking that up for you...';
      msg.style.fontStyle = 'italic';
      convDiv.appendChild(msg);
      convDiv.scrollTop = convDiv.scrollHeight;
    }
    return id;
  }

  function removeLoading(id) {
    const loadingMsg = document.getElementById(id);
    if (loadingMsg) {
      loadingMsg.remove();
    }
  }

  // --- Global Toggle Function ---
  window.slimScreenToggle = function() {
    const widget = ensureWidget();
    if (widget.style.display === 'none' || widget.style.display === '') {
      widget.style.display = 'block';
      updateBookmarkletText("On");
      
      // Only add greeting if conversation is empty
      if (conversationHistory.length === 0) {
        appendMessage('Librarian', 'Hello! I\'m your friendly librarian assistant. Highlight text on this page and press Ctrl+Shift+X, or ask me a question directly.');
      }
    } else {
      widget.style.display = 'none';
      updateBookmarkletText("Off");
    }
  };

  function updateBookmarkletText(state) {
    const bm = document.getElementById('bookmarklet');
    if (bm) bm.textContent = `SlimScreen: ${state}`;
  }

  // --- Conversation Logging ---
  function appendMessage(sender, text) {
    conversationHistory.push({ sender, text });
    const convDiv = document.getElementById('conversation');
    if (convDiv) {
      const msg = document.createElement('div');
      msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
      msg.style.marginBottom = '8px';
      convDiv.appendChild(msg);
      convDiv.scrollTop = convDiv.scrollHeight;
    }
  }

  // --- API Function (Combined Online/Offline) ---
  async function runInference(text) {
    // Get the base URL dynamically
    const baseUrl = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1'
                   ? 'http://localhost:3000/api/infer'
                   : 'https://slim-screen.vercel.app/api/infer';
    
    try {
      // Add a timeout for the fetch operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: text }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If parsing the error fails, keep the default message
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Inference error:", error);
      if (error.name === 'AbortError') {
        throw new Error("Request timed out. Please try again.");
      } else if (!navigator.onLine) {
        return { generated_text: "I'm currently in offline mode with limited functionality. Please check your connection and try again." };
      }
      throw new Error(error.message || "Failed to connect to inference API");
    }
  }

  // --- Post-process API responses ---
  function handleResult(result) {
    if (result.error) {
      appendMessage('Librarian', `Sorry, I encountered an error: ${result.error}`);
    } else if (Array.isArray(result) && result[0]?.generated_text) {
      // Clean the response of any prompt repetition or artifacts
      const cleanedText = cleanResponse(result[0].generated_text);
      appendMessage('Librarian', cleanedText);
    } else if (result.generated_text) {
      // Clean the response of any prompt repetition or artifacts
      const cleanedText = cleanResponse(result.generated_text);
      appendMessage('Librarian', cleanedText);
    } else {
      appendMessage('Librarian', "I received an unexpected response format. Please try again.");
    }
  }

  // Clean up responses to remove prompt leakage or code artifacts
  function cleanResponse(text) {
    // Remove the system prompt instructions completely
    const promptPatterns = [
      /You are a warm, friendly, and polite female librarian[^]*?NATURAL LANGUAGE\./i,
      /Never use bad words\.[^]*?NATURAL LANGUAGE\./i,
      /DO NOT OUTPUT CODE OR TECHNICAL ARTIFACTS\./i,
      /RESPOND ONLY WITH NATURAL LANGUAGE\./i
    ];
    
    let cleaned = text;
    
    // Apply all patterns
    promptPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove code artifacts
    const codeArtifacts = /[A-Za-z]+::[A-Za-z]+\([^)]*\)[^;]*;|Console\.[A-Za-z]+\([^)]*\);|[A-Za-z]+Exception\(\);/g;
    cleaned = cleaned.replace(codeArtifacts, '');
    
    // Remove strange patterns and random phrases that shouldn't be there
    const strangePatterns = /FANT[A-Za-z]+::[^;]*;|Result = [^;]*;|DONT forget about receipts|Urban journals\./g;
    cleaned = cleaned.replace(strangePatterns, '');
    
    // Trim extra whitespace and normalize spaces
    cleaned = cleaned.trim().replace(/\s+/g, ' ');
    
    // If we've removed everything, provide a fallback
    if (!cleaned) {
      cleaned = "I'm sorry, I couldn't generate a proper response. Could you rephrase your question?";
    }
    
    return cleaned;
  }

  // --- Hotkey for Highlighted Text (Ctrl+Shift+X) ---
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        // Ensure widget is visible
        const widget = ensureWidget();
        widget.style.display = 'block';
        updateBookmarkletText("On");
        
        // Add greeting if conversation is empty
        if (conversationHistory.length === 0) {
          appendMessage('Librarian', 'Hello! I\'m your friendly librarian assistant. Let me help you with that.');
        }
        
        appendMessage('User', selectedText);
        
        // Disable input field while processing
        const userInput = widget.querySelector('#user-input');
        if (userInput) userInput.disabled = true;
        
        // Show loading message
        const loadingId = showLoading();
        
        try {
          const result = await runInference(selectedText);
          removeLoading(loadingId);
          handleResult(result);
        } catch (error) {
          removeLoading(loadingId);
          appendMessage('Librarian', `Sorry, I encountered an error: ${error.message || "Unknown error"}`);
        } finally {
          // Re-enable input field
          if (userInput) {
            userInput.disabled = false;
            userInput.focus();
          }
        }
      } else {
        alert('No text selected! Please highlight some text first.');
      }
    }
  });

  // Initialize the widget if this script is loaded directly
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    ensureWidget();
  } else {
    document.addEventListener('DOMContentLoaded', ensureWidget);
  }
  
  // Signal that SlimScreen is loaded
  window.slimScreenLoaded = true;
})();