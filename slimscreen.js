// Immediately-invoked function to isolate our scope
(function() {
  // --- Widget Injection for Any Page ---
  function ensureWidget() {
    let widget = document.getElementById('librarian-widget');
    if (!widget) {
      // Create a style element with !important rules to ensure consistent styling
      const styleId = 'librarian-widget-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          #librarian-widget, #librarian-widget * {
            font-family: 'Arial', sans-serif !important;
            line-height: 1.5 !important;
            box-sizing: border-box !important;
          }
          #librarian-widget {
            position: fixed !important;
            top: 10px !important;
            left: 10px !important;
            width: 320px !important;
            background: #fff !important;
            border: 2px solid #4a90e2 !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2) !important;
            z-index: 9999999 !important;
            transition: width 0.3s, height 0.3s !important;
            color: #333 !important;
            font-size: 14px !important;
          }
          #widget-header {
            cursor: move !important;
            padding: 10px 15px !important;
            background: #4a90e2 !important;
            border-bottom: 1px solid #3a80d2 !important;
          }
          #widget-header strong {
            color: #fff !important;
            font-size: 16px !important;
            font-weight: bold !important;
          }
          #widget-close {
            float: right !important;
            background: transparent !important;
            border: none !important;
            color: #fff !important;
            font-weight: bold !important;
            cursor: pointer !important;
            font-size: 16px !important;
          }
          #conversation {
            max-height: 300px !important;
            overflow-y: auto !important;
            padding: 15px !important;
            background: #fff !important;
          }
          #conversation div {
            margin-bottom: 8px !important;
            color: #333 !important;
          }
          #conversation strong {
            font-weight: bold !important;
            color: #333 !important;
          }
          #user-input {
            width: calc(100% - 30px) !important;
            margin: 10px 15px !important;
            padding: 8px !important;
            border: 1px solid #ccc !important;
            border-radius: 4px !important;
            font-size: 14px !important;
            color: #333 !important;
          }
          #widget-buttons {
            padding: 0 15px 15px !important;
          }
          #widget-buttons button {
            background: #4a90e2 !important;
            color: #fff !important;
            border: none !important;
            padding: 6px 12px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            margin-right: 8px !important;
            font-size: 14px !important;
          }
          #widget-buttons button:hover {
            background: #3a80d2 !important;
          }
        `;
        document.head.appendChild(style);
      }

      widget = document.createElement('div');
      widget.id = 'librarian-widget';
      widget.innerHTML = `
        <div id="widget-header">
          <strong>Friendly Librarian</strong>
          <button id="widget-close">✕</button>
        </div>
        <div id="conversation"></div>
        <input id="user-input" type="text" placeholder="Ask me anything..." />
        <div id="widget-buttons">
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
    
    // Fix for the X button - should close and reset conversation
    widget.querySelector('#widget-close').addEventListener('click', () => {
      widget.style.display = 'none';
      updateBookmarkletText("Off");
      // Clear conversation history and the conversation display
      conversationHistory = [];
      const convDiv = document.getElementById('conversation');
      if (convDiv) {
        convDiv.innerHTML = '';
      }
    });
    
    setupCopySave(widget);
    setupInputHandler(widget);
  }

  // --- Setup Copy/Save Functions ---
  let conversationHistory = [];
  function setupCopySave(widget) {
    const copyBtn = widget.querySelector('#copy-conversation');
    const saveBtn = widget.querySelector('#save-conversation');
    
    // Fix for copy button
    copyBtn.addEventListener('click', () => {
      if (conversationHistory.length === 0) {
        alert('No conversation to copy.');
        return;
      }
      
      const allText = conversationHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
      
      // Modern clipboard API with fallback
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(allText)
          .then(() => alert('Conversation copied to clipboard!'))
          .catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopyTextToClipboard(allText);
          });
      } else {
        fallbackCopyTextToClipboard(allText);
      }
    });
    
    // Fallback copy method for older browsers
    function fallbackCopyTextToClipboard(text) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      // Save current focus and selection
      const focused = document.activeElement;
      const selection = document.getSelection().rangeCount > 0 ? 
                        document.getSelection().getRangeAt(0) : false;
      
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          alert('Conversation copied to clipboard!');
        } else {
          alert('Failed to copy conversation. Your browser may not support this feature.');
        }
      } catch (err) {
        console.error('Failed to copy: ', err);
        alert('Error copying to clipboard: ' + err);
      }
      
      // Clean up
      document.body.removeChild(textArea);
      
      // Restore original focus and selection
      if (selection) {
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(selection);
      }
      if (focused) {
        focused.focus();
      }
    }
    
    // Fix for save button
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
      msg.innerHTML = '<strong>Librarian:</strong> Looking that up for you...';
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
        appendMessage('Librarian', 'Hello! I\'m your friendly librarian. Highlight text for definitions or ask me a question directly.');
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

  // Updated, more thorough clean up responses function
  function cleanResponse(text) {
    // We should have already cleaned the response on the server,
    // but just in case, apply client-side cleaning as well
    
    // Remove system prompt instructions and XML tags
    const promptPatterns = [
      /<system>[\s\S]*?<\/system>/gi,
      /<user>[\s\S]*?<\/user>/gi,
      /<assistant>\s*/gi,
      /You are a friendly female librarian[^]*/gi,
      /^You are a warm, friendly, and polite female librarian[^.]*/gi,
      /Keep your responses brief and helpful[^.]*/gi,
      /Your tone is kind and approachable[^.]*/gi,
      /security purposes/gi,
      /monitoring and recording/gi,
      /Role models Honor the important roles/gi
    ];
    
    let cleaned = text;
    
    // Apply all patterns
    promptPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove code artifacts
    const codeArtifacts = /[A-Za-z]+::[A-Za-z]+\([^)]*\)[^;]*;|Console\.[A-Za-z]+\([^)]*\);|[A-Za-z]+Exception\(\);/g;
    cleaned = cleaned.replace(codeArtifacts, '');
    
    // Remove strange patterns and random phrases
    const strangePatterns = /FANT[A-Za-z]+::[^;]*;|Result = [^;]*;|DONT forget about receipts|Urban journals\./g;
    cleaned = cleaned.replace(strangePatterns, '');
    
    // Remove any responses that repeat the word "librarian" multiple times
    if ((cleaned.match(/librarian/gi) || []).length > 2) {
      const sentences = cleaned.split('.');
      // Keep only sentences that don't mention "librarian"
      cleaned = sentences.filter(s => !s.match(/librarian/gi)).join('.');
    }
    
    // Trim extra whitespace and normalize spaces
    cleaned = cleaned.trim().replace(/\s+/g, ' ');
    
    // If we've removed everything, provide a fallback
    if (!cleaned || cleaned.length < 5) {
      cleaned = "Here's a brief definition of that term. Please let me know if you need more information.";
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
          appendMessage('Librarian', 'Hello! I\'m your friendly librarian. Let me help you with that.');
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