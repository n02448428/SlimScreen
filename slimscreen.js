// Immediately-invoked function to isolate our scope
(function() {
  // --- Global Variables ---
  let conversationHistory = [];
  let widgetVisible = false;
  let widgetMinimized = false;
  let currentPageContext = {};
  
  // --- Debug Helper ---
  function debug(message) {
    console.log(`[SlimScreen] ${message}`);
  }
  
  // --- Page Context Analysis ---
  function analyzePageContext() {
    debug("Analyzing page context");
    
    try {
      // Extract page content for better context analysis
      const mainContent = document.querySelector('main') || document.querySelector('article') || document.body;
      const paragraphs = Array.from(mainContent.querySelectorAll('p')).slice(0, 5); // First 5 paragraphs
      
      // Get main text content
      const contentSample = paragraphs
        .map(p => p.textContent.trim())
        .filter(text => text.length > 30) // Only substantial paragraphs
        .join(' ')
        .substring(0, 1000); // Limit to 1000 chars
      
      // Get basic page information
      currentPageContext = {
        title: document.title || "Unknown Page",
        url: window.location.href,
        domain: window.location.hostname,
        path: window.location.pathname,
        description: getMetaDescription(),
        contentSample: contentSample,
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
    const styleId = 'lexi-widget-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Dark, sleek styling */
        #librarian-widget, #librarian-widget * {
          font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif !important;
          line-height: 1.5 !important;
          box-sizing: border-box !important;
        }
        
        #librarian-widget {
          position: fixed !important;
          top: 20px !important;
          left: 20px !important; /* Changed to left instead of right */
          width: 320px !important;
          background: rgba(22, 25, 37, 0.75) !important; /* More transparent */
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important; /* For Safari */
          border: 1px solid rgba(95, 99, 242, 0.3) !important; /* Subtle purple-blue */
          border-radius: 12px !important; /* More rounded corners */
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3) !important;
          z-index: 2147483647 !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; /* Smoother transition */
          color: #e0e0e0 !important;
          font-size: 14px !important;
          opacity: 0 !important;
          pointer-events: none !important;
          transform: translateY(-10px) scale(0.98) !important;
        }
        
        #librarian-widget.visible {
          opacity: 1 !important;
          pointer-events: all !important;
          transform: translateY(0) scale(1) !important;
        }
        
        #librarian-widget.minimized {
          height: 48px !important;
          overflow: hidden !important;
          border-radius: 24px !important;
          width: 200px !important;
        }
        
        #widget-header {
          cursor: move !important;
          padding: 12px 16px !important;
          background: rgba(45, 48, 65, 0.6) !important; /* Darker header */
          border-radius: 12px 12px 0 0 !important;
          user-select: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }
        
        #librarian-widget.minimized #widget-header {
          border-radius: 24px !important;
          padding: 12px !important;
        }
        
        #widget-header strong {
          color: #fff !important;
          font-size: 14px !important;
          font-weight: 600 !important; /* Semibold instead of bold */
        }
        
        .widget-logo {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        
        .widget-logo-icon {
          color: #8A8FFF !important; /* Purple-blue */
          font-size: 16px !important;
        }
        
        .widget-controls {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
        }
        
        #widget-minimize, #widget-maximize {
          background: rgba(78, 81, 98, 0.4) !important;
          border: none !important;
          color: #fff !important;
          font-weight: normal !important;
          cursor: pointer !important;
          font-size: 14px !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          transition: background 0.2s !important;
        }
        
        #widget-close {
          background: rgba(78, 81, 98, 0.4) !important;
          border: none !important;
          color: #fff !important;
          font-weight: normal !important;
          cursor: pointer !important;
          font-size: 14px !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          transition: background 0.2s !important;
        }
        
        #widget-minimize:hover, #widget-maximize:hover, #widget-close:hover {
          background: rgba(95, 99, 242, 0.5) !important;
        }
        
        #conversation {
          max-height: 250px !important;
          overflow-y: auto !important;
          padding: 16px !important;
          background: transparent !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
          scrollbar-width: thin !important;
          scrollbar-color: rgba(95, 99, 242, 0.3) rgba(22, 25, 37, 0.2) !important;
        }
        
        #conversation::-webkit-scrollbar {
          width: 6px !important;
        }
        
        #conversation::-webkit-scrollbar-track {
          background: rgba(22, 25, 37, 0.2) !important;
        }
        
        #conversation::-webkit-scrollbar-thumb {
          background-color: rgba(95, 99, 242, 0.3) !important;
          border-radius: 6px !important;
        }
        
        #conversation div {
          margin-bottom: 0 !important; /* Remove default margin, using gap instead */
          color: #e0e0e0 !important;
        }
        
        .message-user {
          align-self: flex-end !important;
          background: rgba(95, 99, 242, 0.2) !important;
          padding: 8px 12px !important;
          border-radius: 12px 12px 0 12px !important;
          max-width: 85% !important;
        }
        
        .message-lexi {
          align-self: flex-start !important;
          background: rgba(45, 48, 65, 0.6) !important;
          padding: 8px 12px !important;
          border-radius: 12px 12px 12px 0 !important;
          max-width: 85% !important;
        }
        
        .sender {
          font-size: 12px !important;
          opacity: 0.7 !important;
          margin-bottom: 4px !important;
        }
        
        .sender.lexi {
          color: #8A8FFF !important; /* Purple-blue */
        }
        
        .sender.user {
          color: #A4A9FF !important; /* Lighter purple-blue */
        }
        
        #user-input {
          width: calc(100% - 32px) !important;
          margin: 8px 16px 16px !important;
          padding: 10px 14px !important;
          border: 1px solid rgba(95, 99, 242, 0.2) !important;
          border-radius: 8px !important;
          font-size: 14px !important;
          color: #e0e0e0 !important;
          background: rgba(45, 48, 65, 0.6) !important;
          transition: border-color 0.3s !important;
        }
        
        #user-input:focus {
          outline: none !important;
          border-color: rgba(95, 99, 242, 0.6) !important;
          box-shadow: 0 0 0 2px rgba(95, 99, 242, 0.15) !important;
        }
        
        #user-input::placeholder {
          color: rgba(224, 224, 224, 0.5) !important;
        }
        
        #widget-buttons {
          padding: 0 16px 16px !important;
          display: flex !important;
          justify-content: space-between !important;
          gap: 8px !important;
        }
        
        #widget-buttons button {
          background: rgba(45, 48, 65, 0.8) !important;
          color: #e0e0e0 !important;
          border: 1px solid rgba(95, 99, 242, 0.2) !important;
          padding: 8px 12px !important;
          border-radius: 6px !important;
          cursor: pointer !important;
          font-size: 13px !important;
          flex: 1 !important;
          transition: all 0.2s !important;
        }
        
        #widget-buttons button:hover {
          background: rgba(95, 99, 242, 0.2) !important;
          border-color: rgba(95, 99, 242, 0.4) !important;
        }
        
        #widget-context-button {
          background: transparent !important;
          border: none !important;
          color: rgba(138, 143, 255, 0.8) !important; /* Purple-blue */
          font-size: 12px !important;
          text-decoration: none !important;
          cursor: pointer !important;
          padding: 0 16px 12px !important;
          text-align: center !important;
          display: block !important;
          width: 100% !important;
          opacity: 0.8 !important;
          transition: opacity 0.2s !important;
        }
        
        #widget-context-button:hover {
          opacity: 1 !important;
          text-decoration: underline !important;
        }
        
        .widget-resize-handle {
          position: absolute !important;
          bottom: 0 !important;
          right: 0 !important;
          width: 16px !important;
          height: 16px !important;
          cursor: nwse-resize !important;
          background: rgba(95, 99, 242, 0.3) !important;
          border-radius: 0 0 12px 0 !important;
          transition: background 0.2s !important;
        }
        
        .widget-resize-handle:hover {
          background: rgba(95, 99, 242, 0.5) !important;
        }
        
        /* Toggle button styling */
        #lexi-toggle-button {
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
          width: 48px !important;
          height: 48px !important;
          background: rgba(95, 99, 242, 0.85) !important; /* Purple-blue */
          border-radius: 50% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          font-size: 22px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
          z-index: 2147483646 !important;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), 
                      background 0.2s !important;
          border: none !important;
          color: white !important;
        }
        
        #lexi-toggle-button:hover {
          transform: scale(1.1) !important;
          background: rgba(105, 109, 255, 0.95) !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create widget element with updated structure including minimize button
    const widget = document.createElement('div');
    widget.id = 'librarian-widget';
    widget.innerHTML = `
      <div id="widget-header">
        <div class="widget-logo">
          <span class="widget-logo-icon">📚</span>
          <strong>Lexi</strong>
        </div>
        <div class="widget-controls">
          <button id="widget-minimize" title="Minimize">━</button>
          <button id="widget-maximize" title="Maximize" style="display:none;">⤢</button>
          <button id="widget-close" title="Close">✕</button>
        </div>
      </div>
      <div id="conversation"></div>
      <input id="user-input" type="text" placeholder="Ask Lexi..." />
      <button id="widget-context-button">About this page</button>
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
      // Only start dragging if we clicked on the header, not the buttons
      if (e.target.tagName.toLowerCase() === 'button') {
        return;
      }
      
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
    
    // --- Minimize Button ---
    widget.querySelector('#widget-minimize').addEventListener('click', function() {
      minimizeWidget(widget);
    });
    
    // --- Maximize Button ---
    widget.querySelector('#widget-maximize').addEventListener('click', function() {
      maximizeWidget(widget);
    });
    
    // --- Context Button ---
    widget.querySelector('#widget-context-button').addEventListener('click', function() {
      analyzePageContext();
      appendMessage('user', 'Tell me about this page');
      processContextRequest();
    });
    
    // --- Input Handler ---
    setupInputHandler(widget);
    
    // --- Copy/Save Buttons ---
    setupCopySave(widget);
    
    debug("Widget setup completed");
  }
  
  // --- Minimize Widget ---
  function minimizeWidget(widget) {
    widget.classList.add('minimized');
    widget.querySelector('#widget-minimize').style.display = 'none';
    widget.querySelector('#widget-maximize').style.display = 'inline-block';
    widgetMinimized = true;
    debug("Widget minimized");
  }
  
  // --- Maximize Widget ---
  function maximizeWidget(widget) {
    widget.classList.remove('minimized');
    widget.querySelector('#widget-maximize').style.display = 'none';
    widget.querySelector('#widget-minimize').style.display = 'inline-block';
    widgetMinimized = false;
    debug("Widget maximized");
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
    
    // Display friendly greeting if conversation is empty
    if (conversationHistory.length === 0) {
      const greetings = [
        "Hey there! Great to see you again! What can I help with today?",
        "Hello friend! Need help with something?",
        "Hey! I'm here and ready to assist. What's on your mind?",
        "Welcome back! Need me to explain anything for you?",
        "Hi there! Always happy to see you. What shall we explore today?"
      ];
      
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      appendMessage('lexi', randomGreeting);
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
      
      // Clear conversation history when widget is closed
      conversationHistory = [];
      
      // If minimized, reset to expanded state for next time
      if (widgetMinimized) {
        widget.classList.remove('minimized');
        widget.querySelector('#widget-maximize').style.display = 'none';
        widget.querySelector('#widget-minimize').style.display = 'inline-block';
        widgetMinimized = false;
      }
      
      // Clear conversation display
      const conversation = widget.querySelector('#conversation');
      if (conversation) {
        conversation.innerHTML = '';
      }
    }
    debug("Widget hidden and conversation reset");
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
    const loadingId = showLoading();
    
    // Generate page summary based on actual content, not just meta description
    const contextSummary = generatePageSummary();
    
    // Simulate thinking time for more natural conversation
    setTimeout(() => {
      removeLoading(loadingId);
      appendMessage('lexi', contextSummary);
    }, 800);
  }
  
  // Generate a more accurate page summary based on content
  function generatePageSummary() {
    let summary = "";
    
    if (currentPageContext.contentSample && currentPageContext.contentSample.length > 20) {
      // We have actual content to summarize
      summary = `This page on ${currentPageContext.domain} appears to be about: `;
      
      // Add content based on headings
      if (currentPageContext.headings && currentPageContext.headings.length > 0) {
        const headingTexts = currentPageContext.headings.map(h => h.text);
        summary += headingTexts.join(", ") + ". ";
      }
      
      // Add brief content description
      summary += `The main content discusses ${currentPageContext.contentSample.substring(0, 150)}... Need more specific information?`;
    } else {
      // Fallback to simpler description
      summary = `You're on ${currentPageContext.domain}${currentPageContext.path}. `;
      
      if (currentPageContext.description && currentPageContext.description !== "No description available") {
        summary += `The page is about ${currentPageContext.description}. `;
      }
      
      summary += "Is there something specific you'd like to know?";
    }
    
    return summary;
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
        appendMessage('user', query);
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
              appendMessage('lexi', localResponse);
            }, Math.random() * 400 + 300); // Random delay between 300-700ms (faster)
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
              appendMessage('lexi', `Sorry, I hit a snag: ${result.error}. Mind rephrasing?`);
            } else if (result.generated_text) {
              appendMessage('lexi', result.generated_text);
            } else {
              appendMessage('lexi', "I understand your question, but could you rephrase it?");
            }
          }
        } catch (error) {
          debug(`Error processing query: ${error.message}`);
          removeLoading(loadingId);
          appendMessage('lexi', `Technical issue: ${error.message || "Unknown error"}. Let's try again?`);
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
      loadingMsg.className = 'message-lexi'; // Use message styling
      loadingMsg.innerHTML = '<div class="sender lexi">Lexi</div><div>Thinking...</div>';
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
    // Store in history with sender info
    conversationHistory.push({ sender, text });
    
    const conversation = document.getElementById('conversation');
    if (!conversation) return;
    
    // Create message element with updated styling
    const messageDiv = document.createElement('div');
    
    // Add appropriate class based on sender
    if (sender.toLowerCase() === 'user') {
      messageDiv.className = 'message-user';
      messageDiv.innerHTML = `<div class="sender user">You</div><div>${text}</div>`;
    } else {
      messageDiv.className = 'message-lexi';
      messageDiv.innerHTML = `<div class="sender lexi">Lexi</div><div>${text}</div>`;
    }
    
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
    
    // More friendly, familiar responses
    const greetingResponses = [
      "Hey there! So good to see you again! What can I help with today?",
      "Hi friend! What's on your mind?",
      "Hey! Always great to see you. Need my help with something?"
    ];
    
    const howAreYouResponses = [
      "I'm doing great, thanks for asking! How about you? Need any help today?",
      "Wonderful as always, especially now that we're chatting! What can I do for you?",
      "I'm fantastic! Ready to help with whatever you need."
    ];
    
    const thanksResponses = [
      "You're welcome! Anything else you need, friend?",
      "Happy to help, as always! What else can I do for you?",
      "Anytime! That's what I'm here for."
    ];
    
    const goodbyeResponses = [
      "See you soon! Just click the button when you need me again.",
      "Catch you later! I'll be right here when you need me.",
      "Bye for now! Looking forward to our next chat."
    ];
    
    const whoAreYouResponses = [
      "I'm Lexi, your research assistant and friend! I help explain things and answer your questions.",
      "I'm Lexi! Think of me as your personal research buddy who's always ready to help.",
      "Lexi here! I'm your friendly research assistant. I define terms and explain concepts for you."
    ];
    
    const helpResponses = [
      "Highlight text + Ctrl+Shift+X for instant definitions. Or just ask me anything! You can also minimize me with the — button if you want to keep me around.",
      "Need a definition? Highlight any text and press Ctrl+Shift+X. Want to know about the page? Just ask! You can minimize me to a bar if I'm in the way.",
      "I can define any text you highlight with Ctrl+Shift+X, answer questions about this page, or help with any other questions you have. Use the — button to minimize me if needed!"
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
      return "All systems go! I'm ready to assist you, friend!";
    }
    
    // No matching pattern found
    return null;
  }
  
  // --- API Call ---
  async function runInference(text) {
    debug("Running inference");
    
    // If this is a highlighted text query, process differently
    const isHighlightedText = text.toLowerCase().includes("what does this mean:") || 
                             text.toLowerCase().includes("define:");
    
    // Extract the term to look up
    let searchTerm = '';
    if (isHighlightedText) {
      // Extract the highlighted text
      const match = text.match(/what does this mean:?\s*"([^"]+)"/i) || 
                   text.match(/define:?\s*"([^"]+)"/i);
      if (match && match[1]) {
        searchTerm = match[1].trim();
        debug(`Processing search term: "${searchTerm}"`);
      }
    }
    
    // If we have a search term, try Dictionary API first for word definitions
    if (searchTerm) {
      try {
        // Try Dictionary API FIRST
        debug(`Trying Dictionary API for: ${searchTerm}`);
        const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(searchTerm)}`;
        const response = await fetch(dictUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const entry = data[0];
            
            if (entry.meanings && entry.meanings.length > 0) {
              const meaning = entry.meanings[0];
              
              if (meaning.definitions && meaning.definitions.length > 0) {
                const definition = meaning.definitions[0].definition;
                
                // Format the response
                const partOfSpeech = meaning.partOfSpeech ? ` (${meaning.partOfSpeech})` : '';
                let formattedResponse = `${searchTerm}${partOfSpeech}: ${definition}`;
                
                // Add example if available
                if (meaning.definitions[0].example) {
                  formattedResponse += ` Example: "${meaning.definitions[0].example}"`;
                }
                
                debug("Using dictionary definition");
                return { generated_text: formattedResponse };
              }
            }
          }
        }
        
        // If dictionary fails, try Wikipedia API SECOND
        debug("Dictionary failed, trying Wikipedia API");
        try {
          const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*&srlimit=1`;
          const wikiSearchResponse = await fetch(wikiSearchUrl);
          
          if (wikiSearchResponse.ok) {
            const searchData = await wikiSearchResponse.json();
            
            if (searchData.query && 
                searchData.query.search && 
                searchData.query.search.length > 0) {
              
              const pageId = searchData.query.search[0].pageid;
              
              // Get the extract from Wikipedia
              const wikiExtractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json&origin=*`;
              const wikiExtractResponse = await fetch(wikiExtractUrl);
              
              if (wikiExtractResponse.ok) {
                const extractData = await wikiExtractResponse.json();
                const pages = extractData.query.pages;
                
                if (pages && pages[pageId] && pages[pageId].extract) {
                  let extract = pages[pageId].extract;
                  
                  // Limit to two sentences
                  const sentences = extract.match(/[^.!?]+[.!?]+/g) || [];
                  if (sentences.length > 2) {
                    extract = sentences.slice(0, 2).join(' ');
                  }
                  
                  debug("Using Wikipedia definition");
                  return { generated_text: extract };
                }
              }
            }
          }
          
          debug("Wikipedia API failed too, falling back to LLM");
        } catch (wikiError) {
          debug(`Wikipedia API error: ${wikiError.message}`);
          // Continue to LLM fallback
        }
      } catch (dictError) {
        debug(`Dictionary API error: ${dictError.message}`);
        // Continue to LLM fallback
      }
    }
    
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
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
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
      
      // Clean the response to remove artifacts
      if (result.generated_text) {
        result.generated_text = cleanResponse(result.generated_text);
      }
      
      return result;
    } catch (error) {
      debug(`API error: ${error.message}`);
      
      // If it's a definition request and all APIs failed, return apologetic message
      if (searchTerm) {
        const apologeticResponses = [
          `I'm so sorry, but I don't know what "${searchTerm}" means. I've failed you on this one.`,
          `I deeply apologize, but I can't define "${searchTerm}" for you. I feel terrible about not knowing this.`,
          `I'm truly sorry, but I don't have a definition for "${searchTerm}". I've let you down, and I apologize sincerely.`,
          `Please forgive me, but I don't know what "${searchTerm}" means. This is embarrassing for me.`,
          `I apologize profusely, but I don't have information about "${searchTerm}". I wish I could be more helpful.`
        ];
        
        return { 
          generated_text: apologeticResponses[Math.floor(Math.random() * apologeticResponses.length)]
        };
      }
      
      // Handle specific errors
      if (error.name === 'AbortError') {
        return { 
          generated_text: "I'm so sorry for the delay. I've failed to respond quickly. Could we try a simpler question?"
        };
      }
      
      if (!navigator.onLine) {
        return { 
          generated_text: "Oh no! You're offline. I feel terrible, but I need an internet connection to help you properly."
        };
      }
      
      // Default error response - apologetic
      return { 
        generated_text: `I'm terribly sorry, but I've encountered a problem: ${error.message}. I've failed you, and I sincerely apologize.`
      };
    }
  }
    
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
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
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
      
      // Clean the response to remove artifacts
      if (result.generated_text) {
        result.generated_text = cleanResponse(result.generated_text);
      }
      
      return result;
    } catch (error) {
      debug(`API error: ${error.message}`);
      
      // If it's a definition request and all APIs failed, return apologetic message
      if (searchTerm) {
        const apologeticResponses = [
          `I'm so sorry, but I don't know what "${searchTerm}" means. I've failed you on this one.`,
          `I deeply apologize, but I can't define "${searchTerm}" for you. I feel terrible about not knowing this.`,
          `I'm truly sorry, but I don't have a definition for "${searchTerm}". I've let you down, and I apologize sincerely.`,
          `Please forgive me, but I don't know what "${searchTerm}" means. This is embarrassing for me.`,
          `I apologize profusely, but I don't have information about "${searchTerm}". I wish I could be more helpful.`
        ];
        
        return { 
          generated_text: apologeticResponses[Math.floor(Math.random() * apologeticResponses.length)]
        };
      }
      
      // Handle specific errors
      if (error.name === 'AbortError') {
        return { 
          generated_text: "I'm so sorry for the delay. I've failed to respond quickly. Could we try a simpler question?"
        };
      }
      
      if (!navigator.onLine) {
        return { 
          generated_text: "Oh no! You're offline. I feel terrible, but I need an internet connection to help you properly."
        };
      }
      
      // Default error response - apologetic
      return { 
        generated_text: `I'm terribly sorry, but I've encountered a problem: ${error.message}. I've failed you, and I sincerely apologize.`
      };
    }
  }
  
  // --- Clean Response ---
  function cleanResponse(text) {
    if (!text) return "I'm sorry, I don't quite understand. Could you clarify what you'd like to know?";
    
    // Remove system prompts, tags, and instructions
    const cleaningPatterns = [
      // Remove prompt structures
      /You are Lexi[^"]*"([^"]*)"/i,
      /Define this concisely[^:]*:/i,
      /\[\s*Context:[^\]]*\]/gi,
      
      // Remove system and XML tags
      /<s>[\s\S]*?<\/system>/gi,
      /<user>[\s\S]*?<\/user>/gi,
      /<assistant>[\s\S]*?<\/assistant>/gi,
      /<assistant>\s*/gi,
      
      // Remove instruction patterns
      /You are (a )?(friendly|helpful) (librarian|research assistant)[^.]*/gi,
      /Provide a concise[^.]*\./gi,
      /Focus only on[^.]*\./gi, 
      /Be warm but efficient[^.]*\./gi,
      /Keep your responses brief and helpful[^.]*\./gi,
      /Your tone is kind and approachable[^.]*\./gi,
      
      // Remove reference artifacts
      /Wikipedia, the free encyclopedia"?\]/gi,
      /Define this concisely \(max \d+ sentences\):/gi,
      /Give a clear, brief explanation[^.]*/gi,
    ];
    
    let cleaned = text;
    
    // Apply all cleaning patterns
    cleaningPatterns.forEach(pattern => {
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
      /I'm here to help with that\. Could you provide more context\?/g,
      /I'll help you understand this\./g,
      /According to Wikipedia/gi,
      /Let me find information about/gi
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
      return "I'm sorry, I don't quite understand. Could you clarify what you'd like to know?";
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
      
      const text = conversationHistory.map(msg => 
        `${msg.sender === 'user' ? 'You' : 'Lexi'}: ${msg.text}`
      ).join('\n\n');
      
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
          .then(() => {
            // Show subtle feedback instead of alert
            const button = widget.querySelector('#copy-conversation');
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.background = 'rgba(95, 99, 242, 0.5) !important';
            setTimeout(() => {
              button.textContent = originalText;
              button.style.background = '';
            }, 1500);
          })
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
      
      const text = conversationHistory.map(msg => 
        `${msg.sender === 'user' ? 'You' : 'Lexi'}: ${msg.text}`
      ).join('\n\n');
      
      const filename = `lexi-conversation-${new Date().toISOString().slice(0, 10)}.txt`;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show subtle feedback
        const button = widget.querySelector('#save-conversation');
        const originalText = button.textContent;
        button.textContent = 'Saved!';
        button.style.background = 'rgba(95, 99, 242, 0.5) !important';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '';
        }, 1500);
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
          // Show subtle feedback
          const button = widget.querySelector('#copy-conversation');
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.textContent = originalText;
          }, 1500);
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
  
  // --- Hotkey Listener ---
  function setupHotkey() {
    debug("Setting up hotkey listener (Ctrl+Shift+X)");
    
    document.addEventListener('keydown', async function(e) {
      // Check for Ctrl+Shift+X
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        debug("Hotkey detected: Ctrl+Shift+X");
        e.preventDefault();
        
        // Get selected text only - do not toggle widget
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
          debug(`Selected text detected: ${selectedText.substring(0, 30)}...`);
          
          // Show widget if not already visible
          if (!widgetVisible) {
            showWidget();
          }
          
          // Process the selected text
          appendMessage('user', `What does this mean: "${selectedText}"`);
          const loadingId = showLoading();
          
          try {
            const result = await runInference(`What does this mean: "${selectedText}"`);
            
            if (result.error) {
              appendMessage('lexi', `I'm so sorry, I had trouble with that text. I've failed you. Can you perhaps try a different selection?`);
            } else if (result.generated_text) {
              appendMessage('lexi', result.generated_text);
            } else {
              appendMessage('lexi', "I see you've selected some text, but I'm not sure what it means. I'm sorry for letting you down.");
            }
          } catch (error) {
            debug(`Error processing selected text: ${error.message}`);
            appendMessage('lexi', `I'm terribly sorry, but I couldn't analyze that selection. I've failed you, and I apologize sincerely.`);
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
      menuItem.textContent = 'Ask Lexi';
      menuItem.style.cssText = `
        position: absolute;
        top: ${e.pageY}px;
        left: ${e.pageX}px;
        background: rgba(22, 25, 37, 0.9);
        color: white;
        border: 1px solid rgba(95, 99, 242, 0.4);
        padding: 6px 12px;
        cursor: pointer;
        z-index: 10000;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: 'Inter', sans-serif;
        font-size: 14px;
      `;
      
      document.body.appendChild(menuItem);
      
      // Handle click on our menu item
      menuItem.addEventListener('click', function(e) {
        e.stopPropagation();
        document.body.removeChild(menuItem);
        
        // Show widget and process text
        showWidget();
        appendMessage('user', `What does this mean: "${selectedText}"`);
        
        // Process the selected text
        const loadingId = showLoading();
        
        runInference(`What does this mean: "${selectedText}"`)
          .then(result => {
            removeLoading(loadingId);
            if (result.generated_text) {
              appendMessage('lexi', result.generated_text);
            } else {
              appendMessage('lexi', "I see you've selected some text, but I'm not sure what it means. I'm sorry for letting you down.");
            }
          })
          .catch(error => {
            removeLoading(loadingId);
            debug(`Error processing selected text: ${error.message}`);
            appendMessage('lexi', `I'm terribly sorry, but I couldn't analyze that selection. I've failed you, and I apologize sincerely.`);
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
          appendMessage('lexi', `I see you've navigated to a new page! Let me know if you need help with anything here.`);
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
    
    debug("SlimScreen initialized successfully");
  }
  
  // --- Fixed Toggle Button ---
  function addFixedToggleButton() {
    debug("Adding fixed toggle button");
    
    // Remove any existing button
    const existingButton = document.getElementById('lexi-toggle-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    const button = document.createElement('div');
    button.id = 'lexi-toggle-button';
    button.innerHTML = '📚';
    button.title = 'Toggle Lexi (Ctrl+Shift+X for highlighted text)';
    
    // Click handler
    button.addEventListener('click', () => {
      toggleWidget();
    });
    
    document.body.appendChild(button);
    
    debug("Fixed toggle button added");
  }
  
  // Call initialization when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  // Make toggle function available globally for bookmarklet
  window.slimScreenToggle = toggleWidget;
  window.slimScreenLoaded = true;
  
})();