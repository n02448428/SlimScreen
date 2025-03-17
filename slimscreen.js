// Immediately-invoked function to isolate our scope
(function() {
  // --- Fix for SameSite cookie warnings ---
  // Suppress cookie-related console errors
  (function suppressCookieWarnings() {
    // Store the original console.error function
    const originalConsoleError = console.error;
    
    // Override console.error to filter out cookie warnings
    console.error = function() {
      // Convert arguments to an array
      const args = Array.from(arguments);
      
      // Check if the error message contains cookie-related text
      const errorText = args.join(' ');
      if (errorText.includes('Cookie') && 
          (errorText.includes('SameSite') || 
           errorText.includes('cross-site') || 
           errorText.includes('NetworkProbeLimit'))) {
        // Skip logging these specific cookie warnings
        return;
      }
      
      // Call the original console.error with the original arguments
      return originalConsoleError.apply(console, args);
    };
  })();

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
            background: rgba(255, 255, 255, 0.85) !important;
            backdrop-filter: blur(5px) !important;
            border: 1px solid rgba(74, 144, 226, 0.7) !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
            z-index: 9999999 !important;
            transition: width 0.3s, height 0.3s !important;
            color: #333 !important;
            font-size: 14px !important;
            display: none !important; /* Hide by default */
          }
          #widget-header {
            cursor: move !important;
            padding: 8px 12px !important;
            background: rgba(74, 144, 226, 0.8) !important;
            border-radius: 7px 7px 0 0 !important;
          }
          #widget-header strong {
            color: #fff !important;
            font-size: 14px !important;
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
            max-height: 250px !important;
            overflow-y: auto !important;
            padding: 12px !important;
            background: transparent !important;
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
            width: calc(100% - 24px) !important;
            margin: 8px 12px !important;
            padding: 6px !important;
            border: 1px solid rgba(204, 204, 204, 0.6) !important;
            border-radius: 4px !important;
            font-size: 14px !important;
            color: #333 !important;
            background: rgba(255, 255, 255, 0.7) !important;
          }
          #widget-buttons {
            padding: 0 12px 12px !important;
            display: flex !important;
            justify-content: space-between !important;
          }
          #widget-buttons button {
            background: rgba(74, 144, 226, 0.8) !important;
            color: #fff !important;
            border: none !important;
            padding: 4px 10px !important;
            border-radius: 4px !important;
            cursor: pointer !important;
            font-size: 12px !important;
            flex: 1 !important;
            margin: 0 4px !important;
          }
          #widget-buttons button:first-child {
            margin-left: 0 !important;
          }
          #widget-buttons button:last-child {
            margin-right: 0 !important;
          }
          #widget-buttons button:hover {
            background: rgba(58, 128, 210, 0.9) !important;
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
          <button id="copy-conversation">Copy</button>
          <button id="save-conversation">Save</button>
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
            // NEW: Handle common greetings locally to avoid strange responses
            const response = handleLocalResponse(query) || await runInference(query);
            
            // Remove loading message
            removeLoading(loadingId);
            
            if (typeof response === 'string') {
              // It's a local response
              appendMessage('Librarian', response);
            } else {
              // It's an API response
              handleResult(response);
            }
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

  // --- NEW: Handle common queries locally ---
  function handleLocalResponse(query) {
    const lowerQuery = query.toLowerCase().trim();
    
    // Simple greeting patterns
    if (/^(hi|hello|hey|greetings|howdy)(\s.*)?$/.test(lowerQuery)) {
      return "Hello! How can I help you today?";
    }
    
    // How are you patterns
    if (/^(how are you|how's it going|how are things|what's up)(\?)?$/.test(lowerQuery)) {
      return "I'm doing well, thank you for asking! How can I assist you?";
    }
    
    // Thank you patterns
    if (/^(thank you|thanks|thx|ty)(\s.*)?$/.test(lowerQuery)) {
      return "You're welcome! Let me know if you need anything else.";
    }
    
    // Goodbye patterns
    if (/^(bye|goodbye|see you|cya|farewell)(\s.*)?$/.test(lowerQuery)) {
      return "Goodbye! Feel free to come back if you have more questions.";
    }
    
    // Who are you patterns
    if (/^(who are you|what are you)(\?)?$/.test(lowerQuery)) {
      return "I'm your friendly librarian assistant. I can help with definitions, explanations, and answering questions.";
    }
    
    // Common commands
    if (/^(help|commands|options)$/.test(lowerQuery)) {
      return "You can ask me for definitions, highlight text with Ctrl+Shift+X, or ask me any questions. I'm here to assist you!";
    }
    
    // Test pattern
    if (/^(test|testing)$/.test(lowerQuery)) {
      return "I'm working properly! How can I help you?";
    }
    
    // For activate command
    if (/^(activate|start|begin)$/.test(lowerQuery)) {
      return "I'm active and ready to help. What can I assist you with?";
    }
    
    // For bookmarklet command
    if (/^(bookmarklet)$/.test(lowerQuery)) {
      return "The bookmarklet allows you to activate me on any webpage. You can drag it to your bookmarks bar for easy access.";
    }
    
    // No local response available
    return null;
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
      // First check if we're online
      if (!navigator.onLine) {
        throw new Error("You appear to be offline. Please check your internet connection and try again.");
      }
      
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
          
          // Check if the error is related to the Hugging Face token
          if (errorMessage.includes("API token") || errorMessage.includes("Bearer")) {
            errorMessage = "API authentication failed. Please check your Hugging Face API token configuration.";
          }
        } catch (e) {
          // If parsing the error fails, keep the default message
          console.error("Error parsing error response:", e);
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Fallback for empty responses
      if (!result.generated_text && (!Array.isArray(result) || !result[0]?.generated_text)) {
        return { 
          generated_text: "I received your request, but I'm not sure how to respond to that specific query. Could you try rephrasing or providing more context?"
        };
      }
      
      return result;
    } catch (error) {
      console.error("Inference error:", error);
      
      // Handle specific error cases
      if (error.name === 'AbortError') {
        return { 
          generated_text: "Your request took too long to process. This might be due to high server load or connectivity issues. Please try again in a moment."
        };
      } else if (!navigator.onLine) {
        return { 
          generated_text: "I'm currently in offline mode with limited functionality. Please check your connection and try again."
        };
      } else if (error.message.includes("Hugging Face API error: Unprocessable Entity")) {
        return {
          generated_text: "I encountered a processing error. This might be due to the content of your request or temporary API limitations. Please try with simpler text or try again later."
        };
      }
      
      // Generic error handler as fallback
      return { 
        generated_text: `I encountered an error: ${error.message}. Please try again or refresh the page.`
      };
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
      /You are a friendly female librarian[^.]*/gi,
      /You are a friendly librarian[^.]*/gi,
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
    const strangePatterns = /FANT[A-Za-z]+::[^;]*;|Result = [^;]*;|DONT forget about receipts|Urban journals\.|It is not my face, but a face that bothers me\.|To a space, a space adjacent to hello\.|For the past 14 years\.|Your book's digital RSS feed\./g;
    cleaned = cleaned.replace(strangePatterns, '');
    
    // Remove any responses that repeat the word "librarian" multiple times
    if ((cleaned.match(/librarian/gi) || []).length > 2) {
      const sentences = cleaned.split('.');
      // Keep only sentences that don't mention "librarian"
      cleaned = sentences.filter(s => !s.match(/librarian/gi)).join('.');
    }
    
    // Trim extra whitespace and normalize spaces
    cleaned = cleaned.trim().replace(/\s+/g, ' ');
    
    // Ensure response starts with a capital letter and ends with punctuation
    if (cleaned && cleaned.length > 0) {
      // Capitalize first letter if needed
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      
      // Add period at the end if missing punctuation
      if (!/[.!?]$/.test(cleaned)) {
        cleaned += '.';
      }
    }
    
    // If we've removed everything or if the response is too strange, provide a fallback
    if (!cleaned || cleaned.length < 5 || 
        /could you provide more context|I'm not sure what you mean|I'd need more information/.test(cleaned)) {
      cleaned = "I understand. Let me know if you need help with anything specific.";
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

  // Do NOT automatically initialize widget - wait for bookmarklet click
  
  // Signal that SlimScreen is loaded
  window.slimScreenLoaded = true;
})();