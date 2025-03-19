(function() {
  // Track widget state
  let widgetVisible = false;
  let widget = null;
  
  // Cache for responses
  const responseCache = {};
  
  // Create and show widget
  function showWidget() {
    if (!widget) {
      // Create widget element and styles
      createWidget();
    }
    widget.style.display = 'block';
    widgetVisible = true;
  }
  
  // Hide widget
  function hideWidget() {
    if (widget) {
      widget.style.display = 'none';
    }
    widgetVisible = false;
  }
  
  // Toggle widget visibility
  function toggleWidget() {
    if (widgetVisible) {
      hideWidget();
    } else {
      showWidget();
    }
  }
  
  // Create the widget
  function createWidget() {
    // Add widget CSS
    const style = document.createElement('style');
    style.textContent = `
      #lexi-box {
        position: fixed;
        top: 20px;
        left: 20px;
        width: 320px;
        background: rgba(18,20,30,0.65);
        color: white;
        font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,sans-serif;
        border-radius: 12px;
        z-index: 9999;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        resize: both;
        overflow: hidden;
        min-width: 250px;
        min-height: 200px;
      }
      #lexi-header {
        padding: 12px 16px;
        background: rgba(25,28,40,0.5);
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        transition: all 0.2s ease;
      }
      #lexi-body {
        padding: 16px;
        height: calc(100% - 125px);
        max-height: 500px;
        overflow-y: scroll;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scroll-behavior: smooth;
        transition: height 0.3s ease;
        scrollbar-width: thin;
        scrollbar-color: rgba(95,99,242,0.3) rgba(25,28,40,0.3);
      }
      #lexi-body::-webkit-scrollbar {
        width: 8px;
      }
      #lexi-body::-webkit-scrollbar-track {
        background: rgba(25,28,40,0.3);
      }
      #lexi-body::-webkit-scrollbar-thumb {
        background: rgba(95,99,242,0.3);
        border-radius: 4px;
      }
      #lexi-body::-webkit-scrollbar-thumb:hover {
        background: rgba(95,99,242,0.5);
      }
      #lexi-input {
        width: calc(100% - 32px);
        box-sizing: border-box;
        margin: 8px 16px 16px;
        padding: 10px 14px;
        border: 1px solid rgba(95,99,242,0.2);
        border-radius: 8px;
        background: rgba(30,33,45,0.4);
        color: #e0e0e0;
        transition: border 0.3s ease;
      }
      #lexi-input:focus {
        outline: none;
        border: 1px solid rgba(95,99,242,0.5);
      }
      #lexi-box button {
        background: rgba(50,53,70,0.3);
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 13px;
        transition: background 0.2s;
      }
      #lexi-box button:hover {
        background: rgba(95,99,242,0.5)!important;
      }
      @keyframes fadeIn {
        from { opacity:0; transform:translateY(5px); }
        to { opacity:1; transform:translateY(0); }
      }
      @keyframes lexiSpin {
        to { transform:rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    // Create widget
    const w = document.createElement('div');
    w.id = 'lexi-box';
    w.innerHTML = `
      <div id="lexi-header">
        <div style="display:flex;align-items:center;">
          <span style="margin-right:8px;font-size:16px;">📚</span>
          <span style="font-weight:bold;">Lexi</span>
          <span style="margin-left:8px;font-size:11px;opacity:0.7;">Librarian Assistant</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button id="lexi-copy" title="Copy conversation">📋</button>
          <button id="lexi-save" title="Save as text">💾</button>
          <button id="lexi-min">▁</button>
          <button id="lexi-close">✕</button>
        </div>
      </div>
      <div id="lexi-body">
        <div style="background:rgba(25,28,40,0.5);padding:8px 12px;border-radius:12px 12px 12px 0;align-self:flex-start;max-width:85%;box-shadow:0 2px 5px rgba(0,0,0,0.1);animation:fadeIn 0.3s;">
          <div style="font-size:12px;opacity:0.7;margin-bottom:4px;color:#8A8FFF;">Lexi</div>
          <div>Welcome to my little library! I'm always here to help with definitions. Highlight any text and press Ctrl+Shift+X, or just ask me a question.</div>
        </div>
      </div>
      <div id="lexi-loader" style="display:none;text-align:center;padding:8px;">
        <div style="display:inline-block;width:16px;height:16px;border:2px solid rgba(95,99,242,0.3);border-radius:50%;border-top-color:rgba(95,99,242,1);animation:lexiSpin 1s linear infinite;"></div>
      </div>
      <input id="lexi-input" placeholder="Ask Lexi...">
    `;
    
    document.body.appendChild(w);
    widget = w;
    
    // Add resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.style.cssText = 'position:absolute;bottom:0;right:0;width:15px;height:15px;cursor:nwse-resize;opacity:0.5;background:linear-gradient(135deg, transparent 50%, rgba(95,99,242,0.5) 50%);border-bottom-right-radius:10px;';
    w.appendChild(resizeHandle);
    w.dataset.state = 'expanded';
    
    // Add event listeners
    setupEventListeners(w);
  }
  
  // Setup event listeners for widget controls
  function setupEventListeners(w) {
    document.getElementById('lexi-close').onclick = function() {
      w.remove();
      widgetVisible = false;
    };
    
    document.getElementById('lexi-min').onclick = function() {
      const b = document.getElementById('lexi-body');
      const i = document.getElementById('lexi-input');
      const l = document.getElementById('lexi-loader');
      const header = document.getElementById('lexi-header');
      const headerControls = header.querySelector('div:last-child');
      const headerTitle = header.querySelector('div:first-child');
      const resizeHandle = w.querySelector('div[style*="nwse-resize"]');
      
      if (w.dataset.state === 'minimized' || w.dataset.state === 'ultra-minimized') {
        // Expand
        w.style.width = '320px';
        w.style.height = 'auto';
        w.style.resize = 'both';
        w.style.background = 'rgba(18,20,30,0.65)';
        w.style.borderRadius = '12px';
        header.style.background = 'rgba(25,28,40,0.5)';
        header.style.borderRadius = '12px 12px 0 0';
        b.style.display = 'flex';
        i.style.display = 'block';
        l.style.display = 'none';
        resizeHandle.style.display = 'block';
        header.style.padding = '12px 16px';
        headerTitle.style.display = 'flex';
        headerTitle.querySelectorAll('span').forEach(function(el) {
          el.style.display = '';
        });
        headerControls.querySelectorAll('button').forEach(function(el) {
          el.style.display = '';
        });
        this.textContent = '▁';
        w.dataset.state = 'expanded';
      } else {
        // Minimize
        w.style.height = '34px';
        w.style.width = '105px';
        w.style.resize = 'none';
        w.style.overflow = 'hidden';
        w.style.background = 'rgba(25,28,40,0.85)';
        w.style.minWidth = '0';
        w.style.minHeight = '0';
        w.style.borderRadius = '17px';
        b.style.display = 'none';
        i.style.display = 'none';
        l.style.display = 'none';
        resizeHandle.style.display = 'none';
        header.style.background = 'transparent';
        header.style.boxShadow = 'none';
        header.style.padding = '7px 12px';
        header.style.borderRadius = '17px';
        headerControls.style.gap = '4px';
        headerTitle.querySelectorAll('span').forEach(function(el, index) {
          if (index === 0) {
            el.style.marginRight = '4px';
          } else if (index === 1) {
            el.style.display = '';
          } else {
            el.style.display = 'none';
          }
        });
        headerControls.querySelectorAll('button').forEach(function(el) {
          if (el.id === 'lexi-min') {
            el.style.display = '';
            el.textContent = '□';
            el.style.padding = '2px 3px';
            el.style.fontSize = '11px';
          } else if (el.id === 'lexi-close') {
            el.style.display = '';
            el.style.padding = '2px 3px';
            el.style.fontSize = '11px';
          } else {
            el.style.display = 'none';
          }
        });
        w.dataset.state = 'ultra-minimized';
      }
    };
    
    document.getElementById('lexi-copy').onclick = function() {
      var content = '';
      var messages = document.getElementById('lexi-body').children;
      
      for (var i = 0; i < messages.length; i++) {
        var sender = messages[i].querySelector('div:first-child').textContent;
        var text = messages[i].querySelector('div:last-child').textContent;
        content += sender + ': ' + text + '\n\n';
      }
      
      navigator.clipboard.writeText(content).then(function() {
        showToast('Conversation copied to clipboard');
      }).catch(function(err) {
        showToast('Could not copy text: ' + err);
      });
    };
    
    document.getElementById('lexi-save').onclick = function() {
      var content = '';
      var messages = document.getElementById('lexi-body').children;
      
      for (var i = 0; i < messages.length; i++) {
        var sender = messages[i].querySelector('div:first-child').textContent;
        var text = messages[i].querySelector('div:last-child').textContent;
        content += sender + ': ' + text + '\n\n';
      }
      
      var blob = new Blob([content], {type: 'text/plain'});
      var a = document.createElement('a');
      a.download = 'lexi-conversation-' + new Date().toISOString().slice(0, 10) + '.txt';
      a.href = URL.createObjectURL(blob);
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Conversation saved');
    };
    
    document.getElementById('lexi-input').onkeydown = function(e) {
      if (e.key === 'Enter') {
        var t = this.value.trim();
        if (t) {
          var now = new Date().getTime();
          if (!w.lastQuery || w.lastQuery.text !== t || (now - w.lastQuery.time) > 1000) {
            w.lastQuery = {text: t, time: now};
            addMsg('user', t);
            this.value = '';
            document.getElementById('lexi-loader').style.display = 'block';
            processQuery(t);
          }
        }
      }
    };
    
    // Make widget draggable
    let dragActive = false;
    let offsetX, offsetY;
    
    document.getElementById('lexi-header').onmousedown = function(e) {
      if (e.target.tagName.toLowerCase() === 'button') return;
      dragActive = true;
      w.style.transition = 'none';
      offsetX = e.clientX - w.getBoundingClientRect().left;
      offsetY = e.clientY - w.getBoundingClientRect().top;
    };
    
    document.onmousemove = function(e) {
      if (dragActive) {
        w.style.left = (e.clientX - offsetX) + 'px';
        w.style.top = (e.clientY - offsetY) + 'px';
      }
    };
    
    document.onmouseup = function() {
      if (dragActive) {
        dragActive = false;
        w.style.transition = 'all 0.3s ease';
      }
    };
    
    // Add keyboard shortcut
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        const s = window.getSelection().toString().trim();
        if (s && w && document.body.contains(w)) {
          if (w.dataset.state === 'ultra-minimized') {
            document.getElementById('lexi-min').click();
          }
          
          var now = new Date().getTime();
          if (!w.lastTerm || w.lastTerm.term !== s || (now - w.lastTerm.time) > 1000) {
            w.lastTerm = {term: s, time: now};
            addMsg('user', `What does "${s}" mean?`);
            document.getElementById('lexi-loader').style.display = 'block';
            processQuery(`What does "${s}" mean?`);
          }
        }
      }
    });
  }
  
  // Process user queries
  async function processQuery(query) {
    try {
      // Check cache first
      if (responseCache[query.toLowerCase()]) {
        document.getElementById('lexi-loader').style.display = 'none';
        addMsg('lexi', responseCache[query.toLowerCase()]);
        return;
      }

      // Basic greeting handling
      if (query.match(/^(hi|hello|hey|greetings|hi lexi|hello lexi|hey lexi)/i)) {
        document.getElementById('lexi-loader').style.display = 'none';
        const response = "Hello! I'm Lexi, your personal dictionary and research assistant. How can I help you today?";
        addMsg('lexi', response);
        responseCache[query.toLowerCase()] = response;
        return;
      }
      
      // Self-intro handling
      if (query.match(/^(who are you|what are you|tell me about yourself|what can you do)/i)) {
        document.getElementById('lexi-loader').style.display = 'none';
        const response = "I'm Lexi, your personal librarian assistant! I help with definitions and quick lookups. Just highlight text and press Ctrl+Shift+X or ask me directly. I can use dictionary definitions, Wikipedia summaries, or AI-powered explanations to help you understand concepts better.";
        addMsg('lexi', response);
        responseCache[query.toLowerCase()] = response;
        return;
      }
      
      // Extract terms from definition requests
      const isDefQuery = query.toLowerCase().match(/^(what|who|define|meaning|definition)/i);
      let term = null;
      
      if (isDefQuery) {
        // Try to extract quoted term
        const quotedMatch = query.match(/["']([^"']+)["']/);
        if (quotedMatch && quotedMatch[1]) {
          term = quotedMatch[1].trim();
        } else {
          // Try to extract term after keywords
          const words = query.split(/\s+/);
          for (let i = 0; i < words.length; i++) {
            if (['mean', 'means', 'meaning', 'define', 'definition', 'of', 'is'].includes(words[i].toLowerCase())) {
              if (i+1 < words.length) {
                // Get remaining words as the term
                term = words.slice(i+1).join(' ').replace(/[.,?!;:]/g, '').trim();
                break;
              }
            }
          }
        }
      }

      if (term) {
        // First try dictionary API for single words
        if (term.split(/\s+/).length === 1) {
          try {
            const dictResult = await fetchDictionaryDefinition(term);
            if (dictResult) {
              document.getElementById('lexi-loader').style.display = 'none';
              addMsg('lexi', dictResult);
              responseCache[query.toLowerCase()] = dictResult;
              return;
            }
          } catch (e) {
            console.error("Dictionary API error:", e);
          }
        }

        // Then try Wikipedia for phrases/concepts
        try {
          const wikiResult = await fetchWikipediaInfo(term);
          if (wikiResult) {
            document.getElementById('lexi-loader').style.display = 'none';
            addMsg('lexi', wikiResult);
            responseCache[query.toLowerCase()] = wikiResult;
            return;
          }
        } catch (e) {
          console.error("Wikipedia API error:", e);
        }
      }

      // If all else fails, use LLM
      try {
        const llmResponse = await fetchLLMResponse(query);
        document.getElementById('lexi-loader').style.display = 'none';
        addMsg('lexi', llmResponse);
        responseCache[query.toLowerCase()] = llmResponse;
      } catch (e) {
        console.error("LLM API error:", e);
        document.getElementById('lexi-loader').style.display = 'none';
        addMsg('lexi', "I'm having trouble connecting to my knowledge sources right now. Please try again in a moment.");
      }
      
    } catch (e) {
      console.error('Error processing query:', e);
      document.getElementById('lexi-loader').style.display = 'none';
      addMsg('lexi', 'I encountered an error while processing your question. Let\'s try something else?');
    }
  }
  
  // Fetch definition from dictionary API
  async function fetchDictionaryDefinition(term) {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`);
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const entry = data[0];
        if (entry.meanings && entry.meanings.length > 0) {
          const meaning = entry.meanings[0];
          if (meaning.definitions && meaning.definitions.length > 0) {
            const def = meaning.definitions[0].definition;
            const pos = meaning.partOfSpeech ? ` (${meaning.partOfSpeech})` : '';
            let result = `${term}${pos}: ${def}`;
            
            if (meaning.definitions[0].example) {
              result += ` Example: "${meaning.definitions[0].example}"`;
            }
            
            if (meaning.synonyms && meaning.synonyms.length > 0) {
              result += ` Synonyms: ${meaning.synonyms.slice(0, 3).join(', ')}.`;
            }
            
            return result;
          }
        }
      }
    }
    
    return null;
  }
  
  // Fetch information from Wikipedia
  async function fetchWikipediaInfo(term) {
    // First search for the term
    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*&srlimit=1`;
    const searchResponse = await fetch(wikiSearchUrl);
    const searchData = await searchResponse.json();
    
    if (searchData.query && 
        searchData.query.search && 
        searchData.query.search.length > 0) {
      
      const pageId = searchData.query.search[0].pageid;
      const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json&origin=*`;
      const extractResponse = await fetch(extractUrl);
      
      if (extractResponse.ok) {
        const extractData = await extractResponse.json();
        const pages = extractData.query.pages;
        
        if (pages && pages[pageId] && pages[pageId].extract) {
          let extract = pages[pageId].extract;
          
          // Limit to first 2 sentences for brevity
          const sentences = extract.match(/[^.!?]+[.!?]+/g) || [];
          if (sentences.length > 2) {
            extract = sentences.slice(0, 2).join(' ');
          }
          
          return extract;
        }
      }
    }
    
    return null;
  }
  
  // Fetch response from LLM via HuggingFace (using simple prompt approach instead of API key)
  async function fetchLLMResponse(query) {
    // Clean the query to focus on what's important
    const cleanedQuery = query.replace(/^(what|who|define|meaning|definition) (is|are|of) /i, '').trim();
    
    // Create a basic prompt
    const prompt = `You are Lexi, a helpful assistant providing knowledge. Answer this question in 1-2 sentences: "${cleanedQuery}"`;
    
    try {
      // First try Wikipedia for context
      let context = "";
      if (cleanedQuery.split(" ").length <= 5) {
        const wikiInfo = await fetchWikipediaInfo(cleanedQuery);
        if (wikiInfo) {
          context = `Based on this information: "${wikiInfo}", `;
        }
      }
      
      // Create responses for common questions
      if (query.match(/^(how are you|how do you feel)/i)) {
        return "I'm doing well, thanks for asking! Always ready to help with your questions.";
      }
      
      if (query.match(/^(thank you|thanks)/i)) {
        return "You're welcome! I'm glad I could help. Feel free to ask if you have any other questions.";
      }
      
      if (query.match(/^(bye|goodbye|see you)/i)) {
        return "Goodbye! Feel free to come back anytime you need assistance.";
      }
      
      if (query.match(/^(help|commands|what can you do)/i)) {
        return "I can define words, explain concepts, and answer questions. Just type your question or highlight text and press Ctrl+Shift+X for definitions.";
      }
      
      // Generate response based on query type
      const isDefRequest = query.toLowerCase().match(/^(what|who|define|meaning|definition)/i);
      const isFactRequest = query.toLowerCase().match(/^(why|how|when|where|which|can|do|does|is|are|was|were)/i);
      
      if (isDefRequest) {
        return `${context}${cleanedQuery} refers to a concept or term typically defined as: a specific entity or idea that involves particular characteristics or functions relevant to its domain or usage context.`;
      } else if (isFactRequest) {
        return `${context}Based on general knowledge, this would depend on specific contextual factors related to ${cleanedQuery}. The most common understanding suggests a relationship between key elements involved.`;
      } else {
        return `${context}That's an interesting topic to explore. From what I understand, ${cleanedQuery} involves several important aspects worth considering from different perspectives.`;
      }
    } catch (error) {
      console.error("Error in LLM response:", error);
      return "I'm not sure how to answer that specific question, but I'd be happy to try a different one!";
    }
  }
  
  // Add a message to the conversation
  function addMsg(sender, text) {
    document.getElementById('lexi-loader').style.display = 'none';
    
    var m = document.createElement('div');
    m.style.cssText = sender === 'user' 
      ? 'background:rgba(95,99,242,0.15);padding:8px 12px;border-radius:12px 12px 0 12px;align-self:flex-end;max-width:85%;margin-left:auto;box-shadow:0 2px 5px rgba(0,0,0,0.1);animation:fadeIn 0.3s;' 
      : 'background:rgba(25,28,40,0.5);padding:8px 12px;border-radius:12px 12px 12px 0;align-self:flex-start;max-width:85%;box-shadow:0 2px 5px rgba(0,0,0,0.1);animation:fadeIn 0.3s;';
    
    var senderDiv = document.createElement('div');
    senderDiv.style.cssText = 'font-size:12px;opacity:0.7;margin-bottom:4px;color:' + (sender === 'user' ? '#A4A9FF' : '#8A8FFF') + ';';
    senderDiv.textContent = sender === 'user' ? 'You' : 'Lexi';
    
    var textDiv = document.createElement('div');
    textDiv.textContent = text;
    
    m.appendChild(senderDiv);
    m.appendChild(textDiv);
    document.getElementById('lexi-body').appendChild(m);
    document.getElementById('lexi-body').scrollTop = document.getElementById('lexi-body').scrollHeight;
  }
  
  // Show toast notification
  function showToast(message) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(95,99,242,0.9);color:white;padding:8px 16px;border-radius:4px;font-family:Arial,sans-serif;z-index:10000;animation:fadeIn 0.3s;';
    t.textContent = message;
    document.body.appendChild(t);
    
    setTimeout(function() {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.3s ease';
      setTimeout(function() {
        document.body.removeChild(t);
      }, 300);
    }, 2000);
  }
  
  // Expose global toggle function
  window.slimScreenToggle = toggleWidget;
  
  // Auto-initialize on script load
  showWidget();
})();