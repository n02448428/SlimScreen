// Immediately-invoked function to isolate our scope
(function() {
  // --- Global Variables ---
  let conversationHistory = [];
  let widgetVisible = false;
  let currentPageContext = {};
  
  // --- Debug Helper ---
  function debug(message) {
    console.log(`[SlimScreen] ${message}`);
  }
  
  // --- Page Context Analysis ---
  function analyzePageContext() {
    debug("Analyzing page context");
    
    try {
      // Get basic page information
      currentPageContext = {
        title: document.title || "Unknown Page",
        url: window.location.href,
        domain: window.location.hostname,
        path: window.location.pathname,
        description: getMetaDescription(),
        headings: extractMainHeadings(),
        lastUpdated: new Date().toISOString()
      };
      
      debug("Page context analyzed successfully");
    } catch (error) {
      debug(`Error analyzing page context: ${error.message}`);
      currentPageContext = {
        title: document.title || "Unknown Page",
        url: window.location.href,
        error: "Could not fully analyze page content"
      };
    }
    
    return currentPageContext;
  }
  
  // Helper functions for context analysis
  function getMetaDescription() {
    const metaDesc = document.querySelector('meta[name="description"]');
    return metaDesc ? metaDesc.getAttribute('content') : "No description available";
  }
  
  function extractMainHeadings() {
    const headings = [];
    const h1Elements = document.querySelectorAll('h1');
    const h2Elements = document.querySelectorAll('h2');
    
    // Limit to first 3 h1s and 5 h2s for brevity
    for (let i = 0; i < Math.min(h1Elements.length, 3); i++) {
      headings.push({type: 'h1', text: h1Elements[i].textContent.trim()});
    }
    
    for (let i = 0; i < Math.min(h2Elements.length, 5); i++) {
      headings.push({type: 'h2', text: h2Elements[i].textContent.trim()});
    }
    
    return headings;
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
          top: 20px !important;
          left: 20px !important;
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
          transform: translateY(-10px) !important;
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
        #widget-context-button {
          background: transparent !important;
          border: none !important;
          color: rgba(74, 144, 226, 0.8) !important;
          font-size: 12px !important;
          text-decoration: underline !important;
          cursor: pointer !important;
          padding: 0 12px 8px !important;
          text-align: center !important;
          display: block !important;
          width: 100% !important;
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
      <button id="widget-context-button">Tell me about this page</button>
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
    
    // --- Context Button ---
    widget.querySelector('#widget-context-button').addEventListener('click', function() {
      analyzePageContext();
      appendMessage('User', 'Tell me about this page');
      processContextRequest();
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
    
    // Analyze page context when widget is shown
    analyzePageContext();
    
    // Display greeting if conversation is empty
    if (conversationHistory.length === 0) {
      appendMessage('Librarian', `Hi there! I'm your friendly librarian. I can help you understand content on this page or answer any questions you have. Just highlight text with Ctrl+Shift+X or type your question below.`);
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
  
  // --- Process Page Context Request ---
  function processContextRequest() {
    const contextSummary = `I can see you're on ${currentPageContext.title}. This is ${currentPageContext.domain}${currentPageContext.path}. 
    
The page is about ${currentPageContext.description || "a topic I can't quite determine from the metadata"}. 

${currentPageContext.headings && currentPageContext.headings.length > 0 ? 
  `The main topics appear to be: ${currentPageContext.headings.map(h => h.text).join(", ")}` : 
  "I don't see any clear headings to determine the main topics."}

Is there something specific about this page you'd like to know?`;

    const loadingId = showLoading();
    
    // Simulate thinking time for more natural conversation
    setTimeout(() => {
      removeLoading(loadingId);
      appendMessage('Librarian', contextSummary);
    }, 1000);
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
            // Use local response with slight delay for natural feel
            debug("Using local response");
            setTimeout(() => {
              removeLoading(loadingId);
              appendMessage('Librarian', localResponse);
            }, Math.random() * 800 + 400); // Random delay between 400-1200ms
          } else if (query.toLowerCase().includes('this page') || 
                    query.toLowerCase().includes('this website') || 
                    query.toLowerCase().includes('this site')) {
            // Handle page context questions
            removeLoading(loadingId);
            processContextRequest();
          } else {
            // Call API
            debug("Sending query to API");
            const result = await runInference(query);
            removeLoading(loadingId);
            
            if (result.error) {
              appendMessage('Librarian', `I'm sorry, I ran into a problem: ${result.error}. Would you like to try asking in a different way?`);
            } else if (Array.isArray(result) && result[0]?.generated_text) {
              appendMessage('Librarian', enhanceResponse(result[0].generated_text));
            } else if (result.generated_text) {
              appendMessage('Librarian', enhanceResponse(result.generated_text));
            } else {
              appendMessage('Librarian', "I understand what you're asking, but I'm having trouble formulating a good response. Could you rephrase your question?");
            }
          }
        } catch (error) {
          debug(`Error processing query: ${error.message}`);
          removeLoading(loadingId);
          appendMessage('Librarian', `I encountered a technical issue while processing your question: ${error.message || "Unknown error"}. Let's try again, shall we?`);
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
  
  // --- Local Response Handler with more natural conversation ---
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
    
    // More natural responses with slight variations
    const greetingResponses = [
      "Hello there! How can I help you today?",
      "Hi! What can I help you with?",
      "Hey! I'm here to help. What do you need?"
    ];
    
    const howAreYouResponses = [
      "I'm doing well, thanks for asking! How can I help you today?",
      "I'm great! Ready to assist with whatever you need.",
      "Doing well! What can I help you with?"
    ];
    
    const thanksResponses = [
      "You're welcome! Let me know if you need anything else.",
      "Happy to help! Anything else you'd like to know?",
      "My pleasure! I'm here if you need more assistance."
    ];
    
    const goodbyeResponses = [
      "Goodbye! Feel free to come back if you have more questions.",
      "See you later! Just click the bookmarklet whenever you need me again.",
      "Take care! I'll be here when you need me."
    ];
    
    const whoAreYouResponses = [
      "I'm your friendly librarian assistant. I can help with definitions, explanations, and answering questions about this page or anything else you're curious about.",
      "I'm your personal librarian assistant! I'm here to help you understand content, find information, or answer any questions you might have.",
      "Think of me as your personal research assistant. I can help explain concepts, provide definitions, or give you information about this website."
    ];
    
    const helpResponses = [
      "You can ask me for definitions, highlight text with Ctrl+Shift+X, or ask me any questions about this page or other topics. I'm here to assist you!",
      "I can help in several ways: click 'Tell me about this page' for site info, highlight text and press Ctrl+Shift+X for definitions, or just ask me questions directly.",
      "Need help? You can highlight text and press Ctrl+Shift+X for definitions, ask me about this website, or ask any other questions you have."
    ];
    
    // Random response selector
    function getRandomResponse(responses) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Check patterns and return appropriate response
    if (patterns.greeting.test(lowerQuery)) {
      return getRandomResponse(greetingResponses);
    }
    
    if (patterns.howAreYou.test(lowerQuery)) {
      return getRandomResponse(howAreYouResponses);
    }
    
    if (patterns.thanks.test(lowerQuery)) {
      return getRandomResponse(thanksResponses);
    }
    
    if (patterns.goodbye.test(lowerQuery)) {
      return getRandomResponse(goodbyeResponses);
    }
    
    if (patterns.whoAreYou.test(lowerQuery)) {
      return getRandomResponse(whoAreYouResponses);
    }
    
    if (patterns.help.test(lowerQuery)) {
      return getRandomResponse(helpResponses);
    }
    
    if (patterns.test.test(lowerQuery)) {
      return "I'm working properly! I can help you with information about this page or answer any other questions you might have.";
    }
    
    // No matching pattern found
    return null;
  }
  
  // --- Enhance Response for natural conversation ---
  function enhanceResponse(text) {
    if (!text) return "I received your message, but I'm having trouble formulating a response. Could you try asking in a different way?";
    
    // Clean up response first
    let cleaned = cleanResponse(text);
    
    // Add occasional conversational elements if response is too formal/robotic
    const randomValue = Math.random();
    
    // Add conversational openers (30% chance)
    if (randomValue < 0.3 && !cleaned.startsWith("I ") && !cleaned.startsWith("That's ") && !cleaned.startsWith("Great ")) {
      const openers = [
        "I think ",
        "From what I understand, ",
        "Well, ",
        "Hmm, ",
        "Let's see... "
      ];
      cleaned = openers[Math.floor(Math.random() * openers.length)] + cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
    }
    
    // Add conversational follow-ups (20% chance)
    if (randomValue >= 0.3 && randomValue < 0.5 && !cleaned.includes("?") && !cleaned.includes("let me know")) {
      const followUps = [
        " Does that help?",
        " Does that make sense?",
        " Is that what you were looking for?",
        " Let me know if you need more details.",
        " I hope that answers your question."
      ];
      cleaned += followUps[Math.floor(Math.random() * followUps.length)];
    }
    
    return cleaned;
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
      
      // Enhance the prompt with page context
      let enhancedPrompt = text;
      if (currentPageContext && currentPageContext.title) {
        enhancedPrompt = `[Context: User is on ${currentPageContext.domain}, page titled "${currentPageContext.title}"] ${text}`;
      }
      
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: enhancedPrompt }),
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
          generated_text: "I'm sorry for the delay. The server is taking longer than expected to respond. Would you like to try asking something else?"
        };
      }
      
      if (!navigator.onLine) {
        return { 
          generated_text: "It looks like you're offline right now. Once your connection is restored, I'll be able to help you."
        };
      }
      
      // Default error response
      return { 
        generated_text: `I encountered a problem: ${error.message}. Let's try a different approach.`
      };
    }
  }
  
  // --- Clean Response ---
  function cleanResponse(text) {
    if (!text) return "I received your message, but I'm not sure how to respond to that.";
    
    // Remove system prompts, tags, and instructions
    const patterns = [
      /<system>[\s\S]*?<\/system>/gi,
      /<user>[\s\S]*?<\/user>/gi,
      /<assistant>\s*/gi,
      /You are a (friendly|helpful) librarian[^.]*/gi,
      /Keep your responses brief and helpful[^.]*/gi,
      /Your tone is kind and approachable[^.]*/gi,
      /\[Context: User is on[^\]]*\]/gi
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
      /Urban journals\./g,
      /I'm here to help with that\. Could you provide more context\?/g
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
      cleaned = "I understand what you're asking about. Can you tell me a bit more about what you'd like to know?";
    }
    
    return cleaned;
  }
  
  // --- Hotkey Listener ---
  function setupHotkey() {
    debug("Setting up hotkey listener (Ctrl+Shift+X)");
    
    document.addEventListener('keydown', async function(e) {
      // Check for Ctrl+Shift+X
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        debug("Hotkey detected: Ctrl+Shift+X");
        e.preventDefault();
        
        // Toggle widget visibility
        toggleWidget();
        
        // If widget is now visible and text is selected, use it
        if (widgetVisible) {
          const selectedText = window.getSelection().toString().trim();
          if (selectedText) {
            debug(`Selected text detected: ${selectedText.substring(0, 30)}...`);
            appendMessage('User', `Help me understand: "${selectedText}"`);
            
            // Process the selected text
            const loadingId = showLoading();
            
            try {
              // Enhance prompt with page context
              let enhancedPrompt = `Please explain this text concisely: "${selectedText}"`;
              if (currentPageContext && currentPageContext.title) {
                enhancedPrompt = `[Context: User is on ${currentPageContext.domain}, page titled "${currentPageContext.title}"] ${enhancedPrompt}`;
              }
              
              const result = await runInference(enhancedPrompt);
              
              if (result.error) {
                appendMessage('Librarian', `I'm sorry, I ran into a problem analyzing that text: ${result.error}. Could you try selecting a different section or asking a specific question about it?`);
              } else if (Array.isArray(result) && result[0]?.generated_text) {
                appendMessage('Librarian', enhanceResponse(result[0].generated_text));
              } else if (result.generated_text) {
                appendMessage('Librarian', enhanceResponse(result.generated_text));
              } else {
                appendMessage('Librarian', "I can see you've selected some text, but I'm having trouble understanding it. Could you ask a specific question about what you'd like to know?");
              }
            } catch (error) {
              debug(`Error processing selected text: ${error.message}`);
              appendMessage('Librarian', `I had trouble analyzing that selection: ${error.message || "Unknown error"}. Would you like to try a different approach?`);
            } finally {
              removeLoading(loadingId);
              
              // Focus input field
              setTimeout(() => {
                const input = document.getElementById('user-input');
                if (input) input.focus();
              }, 300);
            }
          }
        }
      }
    });
    
    debug("Hotkey listener set up successfully");
  }
  
  // --- Context Menu ---
  function setupContextMenu() {
    debug("Setting up context menu");
    
    // Listen for contextmenu event
    document.addEventListener('contextmenu', function(e) {
      // Get selected text if any
      const selectedText = window.getSelection().toString().trim();
      if (!selectedText) return; // Continue with normal context menu if no text selected
      
      // Add our custom menu item
      const menuItem = document.createElement('div');
      menuItem.textContent = 'Ask Librarian';
      menuItem.style.cssText = `
        position: absolute;
        top: ${e.pageY}px;
        left: ${e.pageX}px;
        background: white;
        border: 1px solid #ccc;
        padding: 5px 10px;
        cursor: pointer;
        z-index: 10000;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      `;
      
      document.body.appendChild(menuItem);
      
      // Handle click on our menu item
      menuItem.addEventListener('click', function(e) {
        e.stopPropagation();
        document.body.removeChild(menuItem);
        
        // Show widget and process text
        showWidget();
        appendMessage('User', `Help me understand: "${selectedText}"`);
        
        // Process the selected text
        const loadingId = showLoading();
        
        runInference(`Please explain this text concisely: "${selectedText}"`)
          .then(result => {
            removeLoading(loadingId);
            if (result.generated_text) {
              appendMessage('Librarian', enhanceResponse(result.generated_text));
            } else {
              appendMessage('Librarian', "I can see you've selected some text, but I'm having trouble understanding it. Could you ask a specific question about what you'd like to know?");
            }
          })
          .catch(error => {
            removeLoading(loadingId);
            debug(`Error processing selected text: ${error.message}`);
            appendMessage('Librarian', `I had trouble analyzing that selection: ${error.message || "Unknown error"}. Would you like to try a different approach?`);
          });
      });
      
      // Remove menu item when clicking elsewhere
      const removeMenu = function() {
        if (document.body.contains(menuItem)) {
          document.body.removeChild(menuItem);
        }
        document.removeEventListener('click', removeMenu);
      };
      
      document.addEventListener('click', removeMenu);
    });
    
    debug("Context menu set up successfully");
  }
  
  // --- Handle URL Changes (for SPAs) ---
  function setupUrlChangeMonitor() {
    debug("Setting up URL change monitor for SPAs");
    
    // Store current URL to detect changes
    let lastUrl = window.location.href;
    
    // Check periodically for URL changes
    setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        debug(`URL changed from ${lastUrl} to ${currentUrl}`);
        lastUrl = currentUrl;
        
        // Update page context
        analyzePageContext();
        
        // If widget is visible, notify about page change
        if (widgetVisible) {
          appendMessage('Librarian', `I notice you've navigated to a new page: ${document.title}. Let me know if you have any questions about this content.`);
        }
      }
    }, 1000);
    
    debug("URL change monitor set up successfully");
  }
  
  // --- Initialization ---
  function initialize() {
    debug("Initializing SlimScreen");
    
    // Setup main functionality
    setupHotkey();
    setupContextMenu();
    setupUrlChangeMonitor();
    
    // Add fixed toggle button
    addFixedToggleButton();
    
    // Show widget initially (optional, can be commented out)
    // showWidget();
    
    debug("SlimScreen initialized successfully");
  }
  
  // --- Fixed Toggle Button ---
  function addFixedToggleButton() {
    debug("Adding fixed toggle button");
    
    const button = document.createElement('div');
    button.innerHTML = '📚';
    button.title = 'Toggle Librarian (Ctrl+Shift+X)';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      background: rgba(74, 144, 226, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 2147483646;
      transition: transform 0.3s ease;
    `;
    
    // Hover effect
    button.addEventListener('mouseover', () => {
      button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.transform = 'scale(1)';
    });
    
    // Click handler
    button.addEventListener('click', () => {
      toggleWidget();
    });
    
    document.body.appendChild(button);
    
    debug("Fixed toggle button added");
  }
  
  // --- Enhanced Context Awareness ---
  function enhancePageContext() {
    debug("Enhancing page context analysis");
    
    // Add more context from the page content
    try {
      // Get more text content
      const mainContent = document.querySelector('main') || document.querySelector('article') || document.body;
      const paragraphs = mainContent.querySelectorAll('p');
      
      // Extract some paragraph text (limited to first 5 paragraphs)
      let contentSample = [];
      for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
        const text = paragraphs[i].textContent.trim();
        if (text.length > 20) { // Only include substantial paragraphs
          contentSample.push(text);
        }
      }
      
      // Get images with alt text
      const images = document.querySelectorAll('img[alt]');
      const imageData = [];
      
      for (let i = 0; i < Math.min(images.length, 3); i++) {
        const alt = images[i].alt.trim();
        if (alt && alt.length > 3 && alt !== 'logo') {
          imageData.push(alt);
        }
      }
      
      // Enhance the current context
      currentPageContext.contentSample = contentSample;
      currentPageContext.imageDescriptions = imageData;
      
      // Check if page has forms
      currentPageContext.hasForms = document.querySelectorAll('form').length > 0;
      
      // Look for key sections
      currentPageContext.hasCommentsSection = 
        !!document.querySelector('.comments') || 
        !!document.querySelector('#comments') ||
        !!document.querySelector('[data-testid="comments"]');
      
      debug("Enhanced page context successfully");
    } catch (error) {
      debug(`Error enhancing page context: ${error.message}`);
    }
  }
  
  // Call initialization when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  // Make toggle function available globally for bookmarklet
  window.toggleSlimScreen = toggleWidget;
  
})();