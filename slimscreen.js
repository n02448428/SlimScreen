(function() {
  let widgetVisible = false;
  let widget = null;
  const responseCache = {};
  const conversationHistory = [];
  const MAX_HISTORY = 5;
  
  function showWidget() {
    if (!widget) createWidget();
    widget.style.display = 'block';
    widgetVisible = true;
  }
  
  function hideWidget() {
    if (widget) widget.style.display = 'none';
    widgetVisible = false;
  }
  
  function toggleWidget() {
    widgetVisible ? hideWidget() : showWidget();
  }
  
  function createWidget() {
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
    
    const resizeHandle = document.createElement('div');
    resizeHandle.style.cssText = 'position:absolute;bottom:0;right:0;width:15px;height:15px;cursor:nwse-resize;opacity:0.5;background:linear-gradient(135deg, transparent 50%, rgba(95,99,242,0.5) 50%);border-bottom-right-radius:10px;';
    w.appendChild(resizeHandle);
    w.dataset.state = 'expanded';
    
    setupEventListeners(w);
  }
  
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
  
  // NEW INTENT CLASSIFICATION SYSTEM
  async function classifyIntent(query) {
    // Clean the query
    const cleanQuery = query.toLowerCase().trim();
    
    // Check for common conversational expressions
    const conversationalPatterns = {
      // Common expressions
      "^(omg|wow|lol|lmao|rofl|haha|hahaha)$": "conversational",
      "^(get out|get outta here|no way|seriously|really|for real)": "conversational_reaction",
      "^(r u|are you) (sure|kidding|joking|serious)": "conversational_question",
      
      // Basic questions about Lexi
      "^(who|what) are you": "self_intro",
      "^tell me about yourself": "self_intro",
      "^what can you do": "capabilities",
      
      // Gratitude and pleasantries
      "^(thanks|thank you|thx|ty)": "gratitude",
      "^(good job|well done|nice work)": "acknowledgment",
      
      // Greetings and farewells
      "^(hi|hello|hey|greetings|yo)": "greeting",
      "^(bye|goodbye|see you|farewell|ttyl|cya)": "farewell"
    };
    
    // Check against patterns
    for (const [pattern, intent] of Object.entries(conversationalPatterns)) {
      if (new RegExp(pattern, "i").test(cleanQuery)) {
        return { type: intent, query: cleanQuery };
      }
    }
    
    // Check if it's a definition request
    if (cleanQuery.match(/^what does ["']?([^"'?]+)["']? mean\??$/i) || 
        cleanQuery.match(/^what (is|are) ["']?([^"'?]+)["']?\??$/i) ||
        cleanQuery.match(/^define ["']?([^"'?]+)["']?$/i) ||
        cleanQuery.match(/^meaning of ["']?([^"'?]+)["']?$/i)) {
      
      // Extract the term to define
      const term = extractTermToDefine(cleanQuery);
      return { type: "definition_request", term };
    }
    
    // Check if it could be a direct term to look up (single word or short phrase)
    if (cleanQuery.split(/\s+/).length <= 3 && !cleanQuery.match(/^(what|who|how|why|when|where|do|can|will|should)/i)) {
      return { type: "potential_term", term: cleanQuery };
    }
    
    // Default to general query
    return { type: "general_query", query: cleanQuery };
  }
  
  // Extract term to define from various query patterns
  function extractTermToDefine(query) {
    const cleanQuery = query.toLowerCase().trim();
    
    // "What does X mean?"
    const meanMatch = cleanQuery.match(/^what does\s+["']?([^"'?]+)["']?\s+mean\??$/i);
    if (meanMatch && meanMatch[1]) {
      return meanMatch[1].trim();
    }
    
    // "What is/are X?"
    const isMatch = cleanQuery.match(/^what\s+(?:is|are)\s+["']?([^"'?]+)["']?\??$/i);
    if (isMatch && isMatch[1]) {
      return isMatch[1].trim();
    }
    
    // "Define X"
    const defineMatch = cleanQuery.match(/^define\s+["']?([^"'?]+)["']?$/i);
    if (defineMatch && defineMatch[1]) {
      return defineMatch[1].trim();
    }
    
    // "Meaning of X"
    const meaningMatch = cleanQuery.match(/^meaning of\s+["']?([^"'?]+)["']?$/i);
    if (meaningMatch && meaningMatch[1]) {
      return meaningMatch[1].trim();
    }
    
    // Extract anything in quotes as a fallback
    const quoteMatch = cleanQuery.match(/["']([^"']+)["']/);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1].trim();
    }
    
    // If all else fails, just return the query without common question words
    return cleanQuery.replace(/^(what|who|how|why|when|where|is|are|does|do|can|will|would|should|could|define|meaning of)\s+/i, '');
  }
  
  // Process the user query
  async function processQuery(query) {
    try {
      if (responseCache[query.toLowerCase()]) {
        document.getElementById('lexi-loader').style.display = 'none';
        addMsg('lexi', responseCache[query.toLowerCase()]);
        return;
      }

      // First, classify the intent
      const intent = await classifyIntent(query);
      
      // Add to conversation history
      conversationHistory.push({
        role: 'user',
        content: query
      });
      
      // Trim history if needed
      if (conversationHistory.length > MAX_HISTORY * 2) {
        conversationHistory.splice(0, 2);
      }
      
      // Generate response based on intent
      let response;
      
      switch (intent.type) {
        case "greeting":
          response = getRandomGreeting();
          break;
          
        case "farewell":
          response = getRandomFarewell();
          break;
          
        case "gratitude":
          response = getRandomGratitudeResponse();
          break;
          
        case "acknowledgment":
          response = getRandomAcknowledgmentResponse();
          break;
          
        case "self_intro":
          response = "I'm Lexi, your personal librarian assistant! I help with definitions and explanations. Just highlight text and press Ctrl+Shift+X for quick definitions, or type any question to learn about a word or concept.";
          break;
          
        case "capabilities":
          response = "I can define words, explain concepts, and answer questions about various topics. Just ask me 'What does X mean?' or highlight text and press Ctrl+Shift+X for a quick definition.";
          break;
          
        case "conversational":
        case "conversational_reaction":
        case "conversational_question":
          response = handleConversationalInput(intent.query);
          break;
          
        case "definition_request":
          response = await lookupDefinition(intent.term);
          break;
          
        case "potential_term":
          response = await lookupDefinition(intent.term);
          break;
          
        case "general_query":
        default:
          response = await handleGeneralQuery(intent.query);
          break;
      }
      
      // Add response to history
      conversationHistory.push({
        role: 'assistant',
        content: response
      });
      
      // Cache the response
      responseCache[query.toLowerCase()] = response;
      
      // Display the response
      document.getElementById('lexi-loader').style.display = 'none';
      addMsg('lexi', response);
      
    } catch (e) {
      console.error('Error processing query:', e);
      document.getElementById('lexi-loader').style.display = 'none';
      addMsg('lexi', 'I encountered an error while processing your question. Could you try phrasing it differently?');
    }
  }
  
  // Get the last assistant response from conversation history
  function findLastAssistantResponse() {
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      if (conversationHistory[i].role === 'assistant') {
        return conversationHistory[i].content;
      }
    }
    return null;
  }
  
  // Handle conversational inputs
  function handleConversationalInput(query) {
    const cleanQuery = query.toLowerCase().trim();
    
    // Common slang expressions
    const slangResponses = {
      "omg": ["Oh my gosh indeed!", "I know, right?", "Surprised? Me too!"],
      "wow": ["Pretty impressive, isn't it?", "I know, it's fascinating!", "Amazing, right?"],
      "lol": ["Glad you found that amusing!", "That was funny, wasn't it?", "😊 I try to keep things light."],
      "lmao": ["That got a good laugh, huh?", "I'm glad you found that entertaining!", "Humor is important!"],
      "haha": ["I'm glad that was amusing!", "Happy to bring a smile to your day!", "Laughter is the best medicine!"],
      "get out": ["I'm serious!", "No, really!", "It's true though!"],
      "get outta here": ["I'm not kidding!", "It's true, I promise!", "Believe it or not!"],
      "no way": ["Yes way!", "It's true!", "Believe it!"],
      "seriously": ["Absolutely!", "I'm quite serious!", "Indeed!"],
      "really": ["Yes, really!", "Absolutely!", "That's correct!"],
      "r u sure": ["Yes, I'm quite certain.", "I'm confident about that.", "Pretty sure, yes."],
      "are you sure": ["I'm positive.", "Yes, I've double-checked that.", "I'm confident in that information."]
    };
    
    // Check for matching expressions
    for (const [phrase, responses] of Object.entries(slangResponses)) {
      if (cleanQuery.includes(phrase)) {
        return getRandomItem(responses);
      }
    }
    
    // For other conversational inputs
    return "I'm here to help with definitions and answer questions. What would you like to know about?";
  }
  
  // Look up definitions using multiple sources
  async function lookupDefinition(term) {
    // Normalize term
    term = term.trim().replace(/^(the|a|an) /i, '');
    
    // 1. First check our built-in slang dictionary
    const slangDefinition = checkSlangDictionary(term);
    if (slangDefinition) return slangDefinition;
    
    // 2. Then try online dictionary for single words
    if (term.split(/\s+/).length === 1) {
      try {
        const dictResult = await fetchDictionaryDefinition(term);
        if (dictResult) return dictResult;
      } catch (e) {
        console.error("Dictionary API error:", e);
      }
    }
    
    // 3. Try Wikipedia for concepts, names, etc.
    try {
      const wikiResult = await fetchWikipediaInfo(term);
      if (wikiResult) return wikiResult;
    } catch (e) {
      console.error("Wikipedia API error:", e);
    }
    
    // 4. For compound terms, try breaking them down
    if (term.split(/\s+/).length > 1) {
      const compositeDefinition = await generateCompositeDefinition(term);
      if (compositeDefinition) return compositeDefinition;
    }
    
    // 5. Generate a response about the lack of definition
    const fallbacks = [
      `I couldn't find a specific definition for "${term}". Could you provide more context or try a different term?`,
      `I'm not finding a clear definition for "${term}". It might be a specialized term or phrase. Could you clarify?`,
      `"${term}" doesn't appear in my reference sources. Perhaps check the spelling or try using different keywords?`
    ];
    
    return getRandomItem(fallbacks);
  }
  
  // Handle general queries that aren't explicit definition requests
  async function handleGeneralQuery(query) {
    // Extract potential terms and check if any have definitions
    const words = query.split(/\s+/);
    let foundDefn = false;
    let response = '';
    
    // Try direct lookup of the whole query first
    try {
      const wikiResult = await fetchWikipediaInfo(query);
      if (wikiResult) {
        return wikiResult;
      }
    } catch (e) {}
    
    // Try with parts of the query
    for (let windowSize = 3; windowSize >= 1; windowSize--) {
      for (let i = 0; i <= words.length - windowSize; i++) {
        const term = words.slice(i, i + windowSize).join(' ');
        if (term.length > 3) { // Skip very short terms
          try {
            const wikiResult = await fetchWikipediaInfo(term);
            if (wikiResult) {
              response = wikiResult;
              foundDefn = true;
              break;
            }
          } catch (e) {}
        }
      }
      if (foundDefn) break;
    }
    
    if (foundDefn) {
      return response;
    }
    
    // If no definitions found, provide a conversational response
    const generalResponses = [
      "That's an interesting question. I'm primarily designed to help with definitions and explanations. Is there a specific term you'd like me to define?",
      "I'm not sure I understand completely. I'm best at defining words and explaining concepts. Could you rephrase your question?",
      "I'd like to help, but I'm specialized in providing definitions and explanations. Could you ask about a specific term or concept?",
      "That's beyond my current capabilities. I'm primarily a definition assistant. Is there a specific word or phrase you'd like me to explain?"
    ];
    
    return getRandomItem(generalResponses);
  }
  
  // Generate a composite definition for multi-word terms
  async function generateCompositeDefinition(compoundTerm) {
    // Split into individual words
    const words = compoundTerm.split(/[\s,]+/);
    
    // Get definitions for individual words
    const definitions = [];
    for (const word of words) {
      if (word.length > 3 && !['and', 'the', 'of', 'in', 'on', 'by', 'for', 'with', 'a', 'an'].includes(word.toLowerCase())) {
        // First try dictionary for single words
        let def = null;
        try {
          def = await fetchDictionaryDefinition(word);
        } catch (e) {}
        
        // If that fails, try Wikipedia
        if (!def) {
          try {
            def = await fetchWikipediaInfo(word);
          } catch (e) {}
        }
        
        if (def && !def.includes("couldn't find")) {
          // Extract just the core definition without the term itself
          const defParts = def.split(':');
          if (defParts.length > 1) {
            definitions.push(`"${word}": ${defParts.slice(1).join(':').trim()}`);
          } else {
            definitions.push(`"${word}": ${def}`);
          }
        }
      }
    }
    
    if (definitions.length === 0) return null;
    
    // Craft a composite response
    if (definitions.length === 1) {
      return `"${compoundTerm}" likely refers to: ${definitions[0]}`;
    } else {
      return `"${compoundTerm}" combines several concepts: ${definitions.join('; ')}`;
    }
  }
  
  // Check against our built-in slang dictionary
  function checkSlangDictionary(term) {
    const slangDictionary = {
      "omg": "OMG (abbreviation): Oh My God/Gosh - an expression of surprise, shock, or excitement.",
      "lol": "LOL (abbreviation): Laughing Out Loud - used to indicate laughter or amusement.",
      "brb": "BRB (abbreviation): Be Right Back - used to indicate you're temporarily stepping away.",
      "afaik": "AFAIK (abbreviation): As Far As I Know - used to qualify a statement with limited knowledge.",
      "tbh": "TBH (abbreviation): To Be Honest - used to introduce a candid statement.",
      "imo": "IMO (abbreviation): In My Opinion - used to indicate a personal viewpoint.",
      "imho": "IMHO (abbreviation): In My Humble/Honest Opinion - used to politely express a viewpoint.",
      "idk": "IDK (abbreviation): I Don't Know - expressing uncertainty or lack of knowledge.",
      "btw": "BTW (abbreviation): By The Way - used to introduce a side comment or additional information.",
      "fyi": "FYI(abbreviation): For Your Information - used to preface sharing information.",
      "ttyl": "TTYL (abbreviation): Talk To You Later - a casual farewell.",
      "lmao": "LMAO (abbreviation): Laughing My A** Off - used to express intense amusement.",
      "rofl": "ROFL (abbreviation): Rolling On Floor Laughing - used to express extreme amusement.",
      "asap": "ASAP (abbreviation): As Soon As Possible - used to request urgency.",
      "tl;dr": "TL;DR (abbreviation): Too Long; Didn't Read - used to introduce a summary of lengthy content.",
      "yolo": "YOLO (abbreviation): You Only Live Once - used to justify risky or impulsive behavior.",
      "fomo": "FOMO (abbreviation): Fear Of Missing Out - anxiety about missing exciting events.",
      "diy": "DIY (abbreviation): Do It Yourself - projects built or repaired by non-professionals.",
      "eli5": "ELI5 (abbreviation): Explain Like I'm 5 - request for a simplified explanation.",
      "smh": "SMH (abbreviation): Shaking My Head - expressing disappointment or disapproval.",
      "tmi": "TMI (abbreviation): Too Much Information - indicating someone has shared excessive personal details."
    };
    
    // Case-insensitive lookup
    return slangDictionary[term.toLowerCase()];
  }
  
  // Fetch definition from online dictionary API
  async function fetchDictionaryDefinition(term) {
    try {
      // Create direct URL for the term
      const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
      const response = await fetch(url);
      
      // If response is not ok, immediately return null
      if (!response.ok) return null;
      
      // Parse the response
      const data = await response.json();
      
      // Validate the response
      if (!Array.isArray(data) || data.length === 0) return null;
      
      const entry = data[0];
      
      // Critical check: make sure the word returned is the one we asked for
      if (!entry.word || entry.word.toLowerCase() !== term.toLowerCase()) {
        console.log("Word mismatch:", term, "vs", entry.word);
        return null;
      }
      
      // Check if meanings are available
      if (!entry.meanings || entry.meanings.length === 0) return null;
      
      // Get the first meaning
      const meaning = entry.meanings[0];
      if (!meaning.definitions || meaning.definitions.length === 0) return null;
      
      // Build the definition text
      const def = meaning.definitions[0].definition;
      const pos = meaning.partOfSpeech ? ` (${meaning.partOfSpeech})` : '';
      let result = `${term}${pos}: ${def}`;
      
      // Add example if available
      if (meaning.definitions[0].example) {
        result += ` Example: "${meaning.definitions[0].example}"`;
      }
      
      // Add synonyms if available
      if (meaning.synonyms && meaning.synonyms.length > 0) {
        result += ` Synonyms: ${meaning.synonyms.slice(0, 3).join(', ')}.`;
      }
      
      return result;
    } catch (error) {
      console.error("Error fetching dictionary definition:", error);
      return null;
    }
  }
  
  // Fetch information from Wikipedia
  async function fetchWikipediaInfo(term) {
    try {
      // Search for the term
      const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*&srlimit=1`;
      const searchResponse = await fetch(wikiSearchUrl);
      
      if (!searchResponse.ok) return null;
      
      const searchData = await searchResponse.json();
      
      // Validate search results
      if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
        return null;
      }
      
      // Check if the result is related to our term
      const searchResultTitle = searchData.query.search[0].title.toLowerCase();
      const termLower = term.toLowerCase();
      
      // Skip if result doesn't seem related to our term
      // But allow major historical figures and entities that might not have direct word matches
      const isProperNoun = termLower.split(' ').some(word => word.length > 0 && word[0] === word[0].toUpperCase());
      if (!isProperNoun && !searchResultTitle.includes(termLower) && !termLower.includes(searchResultTitle.split(' ')[0])) {
        return null;
      }
      
      // Get extract from the page
      const pageId = searchData.query.search[0].pageid;
      const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${pageId}&format=json&origin=*`;
      const extractResponse = await fetch(extractUrl);
      
      if (!extractResponse.ok) return null;
      
      const extractData = await extractResponse.json();
      
      // Validate extract data
      if (!extractData.query || !extractData.query.pages || !extractData.query.pages[pageId]) {
        return null;
      }
      
      const extract = extractData.query.pages[pageId].extract;
      
      // Skip disambiguation pages
      if (!extract || extract.toLowerCase().includes("may refer to:")) {
        return null;
      }
      
      // Parse sentences
      const sentences = extract.match(/[^.!?]+[.!?]+/g) || [];
      
      // No sentences found
      if (sentences.length === 0) {
        return extract.length < 150 ? extract : null;
      }
      
      // Check if it looks like a list
      const firstSentence = sentences[0];
      if (firstSentence.includes(",") && 
          (firstSentence.includes(" or ") || firstSentence.includes(" and ")) &&
          firstSentence.split(',').length > 3) {
        return `"${term}" has multiple meanings or refers to several different concepts.`;
      }
      
      // Return 1-2 sentences
      if (sentences.length === 1) {
        return sentences[0];
      } else {
        // Include second sentence if it's brief
        return sentences[1].length < 100 ? 
               sentences[0] + " " + sentences[1] : 
               sentences[0];
      }
    } catch (error) {
      console.error("Error fetching Wikipedia info:", error);
      return null;
    }
  }
  
  // Random item selector
  function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  // Random greeting responses
  function getRandomGreeting() {
    const greetings = [
      "Hello! How can I help you today?",
      "Hi there! I'm ready to assist with definitions or explanations.",
      "Hey! What would you like me to look up for you?",
      "Greetings! How can I assist you with definitions today?",
      "Hi! I'm here to help. What term would you like me to explain?"
    ];
    return getRandomItem(greetings);
  }
  
  // Random farewell responses
  function getRandomFarewell() {
    const farewells = [
      "Goodbye! Feel free to come back anytime you need assistance.",
      "See you later! Just click the bookmarklet when you need me again.",
      "Take care! I'll be here when you need definitions.",
      "Farewell! Happy to help anytime you have questions.",
      "Bye for now! Don't hesitate to return when you need information."
    ];
    return getRandomItem(farewells);
  }
  
  // Random gratitude responses
  function getRandomGratitudeResponse() {
    const responses = [
      "You're welcome! Happy to help.",
      "Anytime! Let me know if you need anything else.",
      "My pleasure! Feel free to ask if you have more questions.",
      "Glad I could assist! That's what I'm here for.",
      "No problem at all! I'm always ready to help with definitions."
    ];
    return getRandomItem(responses);
  }
  
  // Random acknowledgment responses
  function getRandomAcknowledgmentResponse() {
    const responses = [
      "Thank you! I aim to be helpful.",
      "I appreciate that! Let me know if you need anything else.",
      "Thanks for the feedback! What else can I help with?",
      "I'm glad it was useful! Feel free to ask more questions.",
      "Thanks! I'm here to provide the best definitions I can."
    ];
    return getRandomItem(responses);
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
  
  window.slimScreenToggle = toggleWidget;
  showWidget();
})();