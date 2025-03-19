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
  
  function classifyQuery(query) {
    const cleanQuery = query.toLowerCase().trim();
    
    if (/^(go on|keep going|continue|tell me more)$/i.test(cleanQuery)) {
      return { type: 'conversation_continuation', query: cleanQuery };
    }
    
    if (/^(i(?:'m| am) not sure|i don'?t understand|what do you mean|can you clarify|that doesn'?t make sense|i(?:'m| am) confused)/i.test(cleanQuery)) {
      return { type: 'clarification_request', query: cleanQuery };
    }
    
    if (/^(hi|hello|hey|greetings|hi lexi|hello lexi|hey lexi)/i.test(cleanQuery)) {
      return { type: 'greeting', query: cleanQuery };
    }
    
    if (/^(bye|goodbye|see you|farewell|exit)/i.test(cleanQuery)) {
      return { type: 'farewell', query: cleanQuery };
    }
    
    if (/^(thanks|thank you|ty|thx)/i.test(cleanQuery)) {
      return { type: 'gratitude', query: cleanQuery };
    }
    
    if (/^(who are you|what are you|tell me about yourself|what can you do)/i.test(cleanQuery)) {
      return { type: 'self_introduction', query: cleanQuery };
    }
    
    // Extract term from "what does X mean"
    const meanMatch = cleanQuery.match(/^what does\s+["']?([^"'?]+)["']?\s+mean\??$/i);
    if (meanMatch && meanMatch[1]) {
      return { type: 'definition', term: meanMatch[1].trim() };
    }
    
    // Extract term from "what is X"
    const isMatch = cleanQuery.match(/^what\s+(?:is|are)\s+["']?([^"'?]+)["']?\??$/i);
    if (isMatch && isMatch[1]) {
      return { type: 'definition', term: isMatch[1].trim() };
    }
    
    // Extract term from definition requests
    const defMatch = cleanQuery.match(/^(?:what|who|define|meaning|definition|explain).*?(?:is|are|does|mean|means|of|by|for)*?\s+["']?([^"'?]+)["']?\??$/i);
    if (defMatch && defMatch[1]) {
      return { type: 'definition', term: defMatch[1].trim() };
    }
    
    // If it's very short, try to define it directly
    if (cleanQuery.split(/\s+/).length === 1 && cleanQuery.length > 2) {
      return { type: 'definition', term: cleanQuery };
    }
    
    return { type: 'general_query', query: cleanQuery };
  }
  
  async function processQuery(query) {
    try {
      if (responseCache[query.toLowerCase()]) {
        document.getElementById('lexi-loader').style.display = 'none';
        addMsg('lexi', responseCache[query.toLowerCase()]);
        return;
      }

      const classification = classifyQuery(query);
      
      conversationHistory.push({
        role: 'user',
        content: query
      });
      
      if (conversationHistory.length > MAX_HISTORY * 2) {
        conversationHistory.splice(0, 2);
      }
      
      let response;
      
      switch (classification.type) {
        case 'greeting':
          const greetings = [
            "Hello! How can I help you today?",
            "Hi there! I'm ready to assist with definitions or explanations.",
            "Hey! What would you like me to look up for you?"
          ];
          response = greetings[Math.floor(Math.random() * greetings.length)];
          break;
          
        case 'farewell':
          const farewells = [
            "Goodbye! Feel free to come back anytime you need assistance.",
            "See you later! Just click the bookmarklet when you need me again.",
            "Take care! I'll be here when you need definitions."
          ];
          response = farewells[Math.floor(Math.random() * farewells.length)];
          break;
          
        case 'gratitude':
          const gratitude = [
            "You're welcome! Happy to help.",
            "Anytime! Let me know if you need anything else.",
            "My pleasure! Feel free to ask if you have more questions."
          ];
          response = gratitude[Math.floor(Math.random() * gratitude.length)];
          break;
          
        case 'self_introduction':
          response = "I'm Lexi, your personal librarian assistant! I help with definitions and explanations. Just highlight text and press Ctrl+Shift+X for quick definitions, or type any question to learn about a word or concept.";
          break;
          
        case 'conversation_continuation':
          if (conversationHistory.length < 2) {
            response = "I don't have any additional information on that topic. Could you ask a specific question?";
          } else {
            const lastAssistantResponse = findLastAssistantResponse();
            if (!lastAssistantResponse) {
              response = "I'm not sure what to elaborate on. Could you ask a specific question?";
            } else if (lastAssistantResponse.indexOf(":") > 0 && lastAssistantResponse.indexOf(":") < 30) {
              response = "That covers the basic definition. If you'd like to know more about a specific aspect, please ask directly.";
            } else {
              response = "That's all the information I have on this topic. If you have a specific question or would like to know about something else, please let me know.";
            }
          }
          break;
          
        case 'clarification_request':
          const lastAssistantResponse = findLastAssistantResponse();
          if (!lastAssistantResponse) {
            response = "What would you like me to clarify? Please ask a specific question.";
          } else if (lastAssistantResponse.indexOf(":") > 0 && lastAssistantResponse.indexOf(":") < 30) {
            const term = lastAssistantResponse.split(":")[0].trim();
            response = `Let me try to explain "${term}" differently: it refers to a concept or term that might be better understood with a specific example or in a particular context. What aspect would you like me to clarify?`;
          } else {
            response = "I apologize if my previous explanation wasn't clear. Could you tell me which part you'd like me to explain differently?";
          }
          break;
          
        case 'definition':
          response = await lookupDefinition(classification.term);
          break;
          
        case 'general_query':
        default:
          const words = query.split(/\s+/);
          let foundDefn = false;
          
          // First try a direct lookup if the query is short
          if (words.length <= 3) {
            try {
              const wikiResult = await fetchWikipediaInfo(query);
              if (wikiResult) {
                response = wikiResult;
                foundDefn = true;
              }
            } catch (e) {}
          }
          
          // If that fails, try with parts of the query
          if (!foundDefn) {
            for (let windowSize = 3; windowSize >= 1; windowSize--) {
              for (let i = 0; i <= words.length - windowSize; i++) {
                const term = words.slice(i, i + windowSize).join(' ');
                try {
                  const wikiResult = await fetchWikipediaInfo(term);
                  if (wikiResult) {
                    response = wikiResult;
                    foundDefn = true;
                    break;
                  }
                } catch (e) {}
              }
              if (foundDefn) break;
            }
          }
          
          if (!foundDefn) {
            const templates = [
              "That's an interesting topic. While I don't have specific information on that, I'd be happy to help if you have any definition questions.",
              "I'm not sure I have the right information to answer that properly. Is there a specific term you'd like me to define?",
              "I don't have enough context to provide a good answer. Could you rephrase your question or ask about a specific word or concept?",
              "I'm better at providing definitions than answering general questions. Is there a particular term you'd like to understand better?",
              "I'm designed primarily for definitions and explanations. Could you ask in a way that focuses on understanding a specific term or concept?"
            ];
            response = templates[Math.floor(Math.random() * templates.length)];
          }
          break;
      }
      
      conversationHistory.push({
        role: 'assistant',
        content: response
      });
      
      responseCache[query.toLowerCase()] = response;
      document.getElementById('lexi-loader').style.display = 'none';
      addMsg('lexi', response);
      
    } catch (e) {
      console.error('Error processing query:', e);
      document.getElementById('lexi-loader').style.display = 'none';
      addMsg('lexi', 'I encountered an error while processing your question. Could you try phrasing it differently?');
    }
  }
  
  function findLastAssistantResponse() {
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      if (conversationHistory[i].role === 'assistant') {
        return conversationHistory[i].content;
      }
    }
    return null;
  }
  
  async function lookupDefinition(term) {
    // Normalize the term
    term = term.trim().replace(/^(the|a|an) /i, '');
    
    // Try exact dictionary lookup for single words
    if (term.split(/\s+/).length === 1) {
      try {
        const dictResult = await fetchDictionaryDefinition(term);
        if (dictResult) return dictResult;
      } catch (e) {
        console.error("Dictionary API error:", e);
      }
    }
    
    // Try Wikipedia for phrases or for single words when dictionary fails
    try {
      const wikiResult = await fetchWikipediaInfo(term);
      if (wikiResult) return wikiResult;
    } catch (e) {
      console.error("Wikipedia API error:", e);
    }
    
    // Generate a response about the lack of definition
    const fallbacks = [
      `I couldn't find a specific definition for "${term}". Could you provide more context or try a different term?`,
      `I'm not finding a clear definition for "${term}". It might be a specialized term or phrase. Could you clarify?`,
      `"${term}" doesn't appear in my reference sources. Perhaps check the spelling or try using different keywords?`
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
  
  async function fetchDictionaryDefinition(term) {
    try {
      // Create direct URL for the term - avoid sending "mean" in the query
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
      if (!searchResultTitle.includes(termLower) && !termLower.includes(searchResultTitle.split(' ')[0])) {
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
  
  function addMsg(sender, text) {
    document.getElementById('lexi-loader').style.display = 'none';
    
    var m = document.createElement('div');
    m.style.cssText = sender === 'user' 
      ?'background:rgba(95,99,242,0.15);padding:8px 12px;border-radius:12px 12px 0 12px;align-self:flex-end;max-width:85%;margin-left:auto;box-shadow:0 2px 5px rgba(0,0,0,0.1);animation:fadeIn 0.3s;' 
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