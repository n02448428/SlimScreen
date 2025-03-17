// Immediately-invoked function to isolate our scope
(function() {
  // --- Global Variables ---
  let conversationHistory = [];
  let widgetVisible = false;
  
  // --- Debug Helper ---
  function debug(message) {
    console.log(`[SlimScreen] ${message}`);
  }
  
  // --- Widget Creation ---
  function createWidget() {
    debug("Creating widget");
    
    // First inject styles with !important to override page styles
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
          top: 20% !important;
          right: 20px !important;
          width: 320px !important;
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(5px) !important;
          border: 1px solid rgba(74, 144, 226, 0.7) !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
          z-index: 2147483647 !important; /* Maximum z-index value */
          transition: width 0.3s, height 0.3s !important;
          color: #333 !important;
          font-size: 14px !important;
          opacity: 0 !important;
          pointer-events: none !important;
          transform: translateY(10px) !important;
          transition: opacity 0.3s ease, transform 0.3s ease !important;
        }
        #librarian-widget.visible {
          opacity: 1 !important;
          pointer-events: all !important;
          transform: translateY(0) !important;
        }
        #widget-header {
          cursor: move !important;
          padding: 8px 12px !important;
          background: rgba(74, 144, 226, 0.8) !important;
          border-radius: 7px 7px 0 0 !important;
          user-select: none !important;
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
          padding: 0 !important;
          margin: 0 !important;
          line-height: 1 !important;
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
          padding: 8px !important;
          border: 1px solid rgba(204, 204, 204, 0.6) !important;
          border-radius: 4px !important;
          font-size: 14px !important;
          color: #333 !important;
          background: rgba(255, 255, 255, 0.9) !important;
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
          padding: 6px 12px !important;
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
        .widget-resize-handle {
          position: absolute !important;
          bottom: 0 !important;
          right: 0 !important;
          width: 16px !important;
          height: 16px !important;
          cursor: nwse-resize !important;
          background: rgba(74, 144, 226, 0.5) !important;
          border-radius: 0 0 8px 0 !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create widget element
    const widget = document.createElement('div');
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
      <div class="widget-resize-handle"></div>
    `;
    
    // Append widget to body
    document.body.appendChild(widget);
    debug("Widget created and appended to body");
    
    return widget;
  }
  
  // --- Widget Setup ---
  function setupWidget(widget) {
    debug("Setting up widget functionality");
    
    // --- Draggable Header ---
    const header = widget.querySelector('#widget-header');
    let isDragging = false, offsetX, offsetY;
    
    header.addEventListener('mousedown', function(e) {
      isDragging = true;
      offsetX = e.clientX - widget.getBoundingClientRect().left;
      offsetY = e.clientY - widget.getBoundingClientRect().top;
      header.style.cursor = 'grabbing';
      e.preventDefault(); // Prevent text selection during drag
    });
    
    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      
      // Keep widget within viewport bounds
      const maxX = window.innerWidth - widget.offsetWidth;
      const maxY = window.innerHeight - widget.offsetHeight;
      
      widget.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
      widget.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    });
    
    document.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'move';
      }
    });
    
    // --- Resizable Widget ---
    const resizeHandle = widget.querySelector('.widget-resize-handle');
    let isResizing = false, startWidth, startHeight, startX, startY;
    
    resizeHandle.addEventListener('mousedown', function(e) {
      isResizing = true;
      startWidth = widget.offsetWidth;
      startHeight = widget.offsetHeight;
      startX = e.clientX;
      startY = e.clientY;
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
      if (!isResizing) return;
      
      const width = startWidth + (e.clientX - startX);
      const height = startHeight + (e.clientY - startY);
      
      if (width >= 250) widget.style.width = width + 'px';
      if (height >= 200) {
        widget.style.height = height + 'px';
        const conversation = widget.querySelector('#conversation');
        if (conversation) {
          conversation.style.height = (height - 120) + 'px'; // Adjust content height
        }
      }
    });
    
    document.addEventListener('mouseup', function() {
      isResizing = false;
    });
    
    // --- Close Button ---
    widget.querySelector('#widget-close').addEventListener('click', function() {
      hideWidget();
    });
    
    // --- Input Handler ---
    setupInputHandler(widget);
    
    // --- Copy/Save Buttons ---
    setupCopySave(widget);
    
    debug("Widget setup completed");
  }
  
  // --- Show/Hide Widget ---
  function showWidget() {
    debug("Showing widget");
    const widget = document.getElementById('librarian-widget') || createWidget();
    
    // First time setup if needed
    if (!widget.dataset.initialized) {
      setupWidget(widget);
      widget.dataset.initialized = 'true';
    }
    
    // Display greeting if conversation is empty
    if (conversationHistory.length === 0) {
      appendMessage('Librarian', 'Hello! I\'m your friendly librarian. Highlight text for definitions or ask me a question directly.');
    }
    
    // Make widget visible with animation
    widget.classList.add('visible');
    widgetVisible = true;
    
    // Focus input field
    setTimeout(() => {
      const input = widget.querySelector('#user-input');
      if (input) input.focus();
    }, 300);
    
    debug("Widget is now visible");
  }
  
  function hideWidget() {
    debug("Hiding widget");
    const widget = document.getElementById('librarian-widget');
    if (widget) {
      widget.classList.remove('visible');
      widgetVisible = false;
    }
    debug("Widget hidden");
  }
  
  // --- Toggle Widget ---
  function toggleWidget() {
    debug("Toggling widget visibility");
    if (widgetVisible) {
      hideWidget();
    } else {
      showWidget();
    }
  }
  
  // --- Input Handler ---
  function setupInputHandler(widget) {
    const userInput = widget.querySelector('#user-input');
    
    userInput.addEventListener('keydown', async function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        
        const query = userInput.value.trim();
        if (!query) return;
        
        debug(`Processing user input: ${query}`);
        appendMessage('User', query);
        userInput.value = '';
        userInput.disabled = true;
        
        // Show loading indicator
        const loadingId = showLoading();
        
        try {
          // Check for local response first
          const localResponse = handleLocalResponse(query);
          
          if (localResponse) {
            // Use local response
            debug("Using local response");
            removeLoading(loadingId);
            appendMessage('Librarian', localResponse);
          } else {
            // Call API
            debug("Sending query to API");
            const result = await runInference(query);
            removeLoading(loadingId);
            
            if (result.error) {
              appendMessage('Librarian', `Sorry, I encountered an error: ${result.error}`);
            } else if (Array.isArray(result) && result[0]?.generated_text) {
              appendMessage('Librarian', cleanResponse(result[0].generated_text));
            } else if (result.generated_text) {
              appendMessage('Librarian', cleanResponse(result.generated_text));
            } else {
              appendMessage('Librarian', "I received your request but couldn't generate a proper response. Please try again.");
            }
          }
        } catch (error) {
          debug(`Error processing query: ${error.message}`);
          removeLoading(loadingId);
          appendMessage('Librarian', `Sorry, I encountered an error: ${error.message || "Unknown error"}`);
        } finally {
          userInput.disabled = false;
          userInput.focus();
        }
      }
    });
  }
  
  // --- Loading Indicator ---
  function showLoading() {
    const id = 'loading-' + Date.now();
    const conversation = document.getElementById('conversation');
    
    if (conversation) {
      const loadingMsg = document.createElement('div');
      loadingMsg.id = id;
      loadingMsg.innerHTML = '<strong>Librarian:</strong> <em>Looking that up for you...</em>';
      conversation.appendChild(loadingMsg);
      conversation.scrollTop = conversation.scrollHeight;
    }
    
    return id;
  }
  
  function removeLoading(id) {
    const loadingMsg = document.getElementById(id);
    if (loadingMsg) loadingMsg.remove();
  }
  
  // --- Append Messages ---
  function appendMessage(sender, text) {
    conversationHistory.push({ sender, text });
    
    const conversation = document.getElementById('conversation');
    if (!conversation) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
    conversation.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    conversation.scrollTop = conversation.scrollHeight;
    
    debug(`Appended message from ${sender}`);
  }
  
  // --- Local Response Handler ---
  function handleLocalResponse(query) {
    const lowerQuery = query.toLowerCase().trim();
    
    // Common patterns
    const patterns = {
      greeting: /^(hi|hello|hey|greetings|howdy)(\s.*)?$/,
      howAreYou: /^(how are you|how's it going|how are things|what's up)(\?)?$/,
      thanks: /^(thank you|thanks|thx|ty)(\s.*)?$/,
      goodbye: /^(bye|goodbye|see you|cya|farewell)(\s.*)?$/,
      whoAreYou: /^(who are you|what are you)(\?)?$/,
      help: /^(help|commands|options)$/,
      test: /^(test|testing)$/
    };
    
    // Check patterns and return appropriate response
    if (patterns.greeting.test(lowerQuery)) {
      return "Hello! How can I help you today?";
    }
    
    if (patterns.howAreYou.test(lowerQuery)) {
      return "I'm doing well, thank you for asking! How can I assist you?";
    }
    
    if (patterns.thanks.test(lowerQuery)) {
      return "You're welcome! Let me know if you need anything else.";
    }
    
    if (patterns.goodbye.test(lowerQuery)) {
      return "Goodbye! Feel free to come back if you have more questions.";
    }
    
    if (patterns.whoAreYou.test(lowerQuery)) {
      return "I'm your friendly librarian assistant. I can help with definitions, explanations, and answering questions.";
    }
    
    if (patterns.help.test(lowerQuery)) {
      return "You can ask me for definitions, highlight text with Ctrl+Shift+X, or ask me any questions. I'm here to assist you!";
    }
    
    if (patterns.test.test(lowerQuery)) {
      return "I'm working properly! How can I help you?";
    }
    
    // No matching pattern found
    return null;
  }
  
  // --- Copy/Save Functionality ---
  function setupCopySave(widget) {
    // Copy button
    widget.querySelector('#copy-conversation').addEventListener('click', function() {
      if (conversationHistory.length === 0) {
        alert('No conversation to copy.');
        return;
      }
      
      const text = conversationHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
      
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
          .then(() => alert('Conversation copied to clipboard!'))
          .catch(err => {
            debug(`Clipboard error: ${err.message}`);
            fallbackCopy(text);
          });
      } else {
        fallbackCopy(text);
      }
    });
    
    // Save button
    widget.querySelector('#save-conversation').addEventListener('click', function() {
      if (conversationHistory.length === 0) {
        alert('No conversation to save.');
        return;
      }
      
      const text = conversationHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `slimscreen-conversation-${new Date().toISOString().slice(0, 10)}.txt`;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    });
    
    // Fallback copy method
    function fallbackCopy(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        const success = document.execCommand('copy');
        if (success) {
          alert('Conversation copied to clipboard!');
        } else {
          alert('Unable to copy. Your browser may not support this feature.');
        }
      } catch (err) {
        debug(`execCommand error: ${err.message}`);
        alert('Copying failed. Your browser may not support this feature.');
      }
      
      document.body.removeChild(textarea);
    }
  }
  
  // --- API Call ---
  async function runInference(text) {
    debug("Running inference");
    
    // Set base URL based on environment
    const baseUrl = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1'
                   ? 'http://localhost:3000/api/infer'
                   : 'https://slim-screen.vercel.app/api/infer';
    
    debug(`Using API endpoint: ${baseUrl}`);
    
    try {
      // Check online status
      if (!navigator.onLine) {
        throw new Error("You appear to be offline. Please check your internet connection.");
      }
      
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
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
          // Keep default error if parsing fails
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      debug("Received API response");
      
      return result;
    } catch (error) {
      debug(`API error: ${error.message}`);
      
      // Handle specific errors
      if (error.name === 'AbortError') {
        return { 
          generated_text: "Your request took too long. This might be due to server load or network issues. Please try again shortly."
        };
      }
      
      if (!navigator.onLine) {
        return { 
          generated_text: "You appear to be offline. Please check your internet connection and try again."
        };
      }
      
      // Default error response
      return { 
        generated_text: `I encountered a problem: ${error.message}. Please try again later.`
      };
    }
  }
  
  // --- Clean Response ---
  function cleanResponse(text) {
    if (!text) return "I received your message, but couldn't generate a clear response.";
    
    // Remove system prompts, tags, and instructions
    const patterns = [
      /<system>[\s\S]*?<\/system>/gi,
      /<user>[\s\S]*?<\/user>/gi,
      /<assistant>\s*/gi,
      /You are a (friendly|helpful) librarian[^.]*/gi,
      /Keep your responses brief and helpful[^.]*/gi,
      /Your tone is kind and approachable[^.]*/gi
    ];
    
    let cleaned = text;
    
    // Apply all cleaning patterns
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove strange artifacts and phrases
    const strangePatterns = [
      /It is not my face, but a face that bothers me\./g,
      /To a space, a space adjacent to hello\./g,
      /For the past 14 years\./g,
      /Your book's digital RSS feed\./g,
      /FANT[A-Za-z]+::[^;]*;/g,
      /Result = [^;]*;/g,
      /DONT forget about receipts/g,
      /Urban journals\./g
    ];
    
    strangePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Clean whitespace and normalize
    cleaned = cleaned.trim().replace(/\s+/g, ' ');
    
    // Ensure proper formatting
    if (cleaned && cleaned.length > 0) {
      // Capitalize first letter
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      
      // Add period if missing
      if (!/[.!?]$/.test(cleaned)) {
        cleaned += '.';
      }
    }
    
    // Fallback if we've removed too much
    if (!cleaned || cleaned.length < 5) {
      cleaned = "I understand. Let me know if you need more information or have other questions.";
    }
    
    return cleaned;
  }
  
  // --- Hotkey Listener ---
  function setupHotkey() {
    debug("Setting up hotkey listener (Ctrl+Shift+X)");
    
    document.addEventListener('keydown', async function(e) {
      // Check for Ctrl+Shift+X
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') {
        debug("Hotkey triggered");
        
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
          alert('No text selected! Please highlight some text first.');
          return;
        }
        
        // Show widget if not visible
        if (!widgetVisible) {
          showWidget();
        }
        
        // Process the selected text
        appendMessage('User', selectedText);
        
        // Disable input during processing
        const userInput = document.getElementById('user-input');
        if (userInput) userInput.disabled = true;
        
        // Show loading indicator
        const loadingId = showLoading();
        
        try {
          debug("Processing selected text");
          const result = await runInference(selectedText);
          
          removeLoading(loadingId);
          
          if (result.error) {
            appendMessage('Librarian', `Sorry, I encountered an error: ${result.error}`);
          } else if (Array.isArray(result) && result[0]?.generated_text) {
            appendMessage('Librarian', cleanResponse(result[0].generated_text));
          } else if (result.generated_text) {
            appendMessage('Librarian', cleanResponse(result.generated_text));
          } else {
            appendMessage('Librarian', "I received your selection but couldn't generate a proper response. Please try again.");
          }
        } catch (error) {
          debug(`Error processing selection: ${error.message}`);
          removeLoading(loadingId);
          appendMessage('Librarian', `Sorry, I encountered an error: ${error.message || "Unknown error"}`);
        } finally {
          // Re-enable input
          if (userInput) {
            userInput.disabled = false;
            userInput.focus();
          }
        }
      }
    });
  }
  
  // --- Public Toggle Function ---
  window.slimScreenToggle = function() {
    debug("SlimScreen toggle called");
    toggleWidget();
  };
  
  // --- Initialization ---
  function init() {
    debug("Initializing SlimScreen");
    setupHotkey();
    
    // Signal that SlimScreen is loaded
    window.slimScreenLoaded = true;
    
    debug("SlimScreen initialized successfully");
  }
  
  // Run initialization
  init();
})();