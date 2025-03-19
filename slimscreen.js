(function(){
  // Check if Lexi is already loaded
  if (window.lexiLoaded) {
    console.log('Lexi already loaded');
    return;
  }
  
  // Mark Lexi as loaded
  window.lexiLoaded = true;
  
  // Create main widget
  var w = document.createElement('div');
  w.id = 'lexi-box';
  w.style.cssText = 'position:fixed;top:20px;left:20px;width:320px;background:rgba(18,20,30,0.65);color:white;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Ubuntu,sans-serif;border-radius:12px;z-index:9999;box-shadow:0 5px 15px rgba(0,0,0,0.3);backdrop-filter:blur(10px);transition:all 0.3s ease;resize:both;overflow:hidden;min-width:250px;min-height:200px;';
  
  // Create header and body HTML
  w.innerHTML = `
    <div id="lexi-header" style="padding:12px 16px;background:rgba(25,28,40,0.5);border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center;cursor:move;transition:all 0.2s ease;">
      <div style="display:flex;align-items:center;">
        <span style="margin-right:8px;font-size:16px;">📚</span>
        <span style="font-weight:bold;">Lexi</span>
        <span style="margin-left:8px;font-size:11px;opacity:0.7;">Librarian Assistant</span>
      </div>
      <div style="display:flex;gap:6px;">
        <button id="lexi-copy" title="Copy conversation" style="background:rgba(50,53,70,0.3);border:none;color:white;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:13px;transition:background 0.2s;">📋</button>
        <button id="lexi-save" title="Save as text" style="background:rgba(50,53,70,0.3);border:none;color:white;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:13px;transition:background 0.2s;">💾</button>
        <button id="lexi-min" style="background:rgba(50,53,70,0.3);border:none;color:white;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:13px;transition:background 0.2s;">▁</button>
        <button id="lexi-close" style="background:rgba(50,53,70,0.3);border:none;color:white;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:13px;transition:background 0.2s;">✕</button>
      </div>
    </div>
    <div id="lexi-body" style="padding:16px;height:calc(100% - 125px);max-height:500px;overflow-y:scroll;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth;transition:height 0.3s ease;scrollbar-width:thin;scrollbar-color:rgba(95,99,242,0.3) rgba(25,28,40,0.3);">
      <div style="background:rgba(25,28,40,0.5);padding:8px 12px;border-radius:12px 12px 12px 0;align-self:flex-start;max-width:85%;box-shadow:0 2px 5px rgba(0,0,0,0.1);animation:fadeIn 0.3s;">
        <div style="font-size:12px;opacity:0.7;margin-bottom:4px;color:#8A8FFF;">Lexi</div>
        <div>Welcome to my little library! I'm always here to help with definitions. Highlight any text and press Ctrl+Shift+X, or just ask me a question.</div>
      </div>
    </div>
    <div id="lexi-loader" style="display:none;text-align:center;padding:8px;">
      <div style="display:inline-block;width:16px;height:16px;border:2px solid rgba(95,99,242,0.3);border-radius:50%;border-top-color:rgba(95,99,242,1);animation:lexiSpin 1s linear infinite;"></div>
    </div>
    <input id="lexi-input" style="width:calc(100% - 32px);box-sizing:border-box;margin:8px 16px 16px;padding:10px 14px;border:1px solid rgba(95,99,242,0.2);border-radius:8px;background:rgba(30,33,45,0.4);color:#e0e0e0;transition:border 0.3s ease;" placeholder="Ask Lexi...">
    <style>
      @keyframes fadeIn {
        from { opacity:0; transform:translateY(5px); }
        to { opacity:1; transform:translateY(0); }
      }
      @keyframes lexiSpin {
        to { transform:rotate(360deg); }
      }
      #lexi-box button:hover {
        background:rgba(95,99,242,0.5)!important;
      }
      #lexi-input:focus {
        outline:none;
        border:1px solid rgba(95,99,242,0.5);
      }
      #lexi-body::-webkit-scrollbar {
        width:8px;
      }
      #lexi-body::-webkit-scrollbar-track {
        background:rgba(25,28,40,0.3);
      }
      #lexi-body::-webkit-scrollbar-thumb {
        background:rgba(95,99,242,0.3);
        border-radius:4px;
      }
      #lexi-body::-webkit-scrollbar-thumb:hover {
        background:rgba(95,99,242,0.5);
      }
    </style>
  `;
  
  // Add resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.style.cssText = 'position:absolute;bottom:0;right:0;width:15px;height:15px;cursor:nwse-resize;opacity:0.5;background:linear-gradient(135deg, transparent 50%, rgba(95,99,242,0.5) 50%);border-bottom-right-radius:10px;';
  w.appendChild(resizeHandle);
  w.dataset.state = 'expanded';
  
  // Add to document
  document.body.appendChild(w);
  
  // API endpoint for Lexi's serverless function
  const API_ENDPOINT = 'https://lexi-assistant.vercel.app/api/infer';
  
  // Cache for dictionary lookups to minimize API calls
  const dictCache = {};
  
  // Button event handlers
  document.getElementById('lexi-close').onclick = function() {
    w.remove();
  };
  
  document.getElementById('lexi-min').onclick = function() {
    var b = document.getElementById('lexi-body');
    var i = document.getElementById('lexi-input');
    var l = document.getElementById('lexi-loader');
    var header = document.getElementById('lexi-header');
    var headerControls = header.querySelector('div:last-child');
    var headerTitle = header.querySelector('div:first-child');
    
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
  
  // Input handler
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
  
  // Process user queries
  async function processQuery(query) {
    try {
      // Basic greeting handling
      if (query.match(/^(hi|hello|hey|greetings|hi lexi|hello lexi|hey lexi)/i)) {
        document.getElementById('lexi-loader').style.display = 'none';
        addMsg('lexi', 'Hello! I\'m Lexi, your personal dictionary and research assistant. How can I help you today?');
        return;
      }
      
      // Self-intro handling
      if (query.match(/^(who are you|what are you|tell me about yourself|what can you do)/i)) {
        document.getElementById('lexi-loader').style.display = 'none';
        addMsg('lexi', 'I\'m Lexi, your personal librarian assistant! I help with definitions and quick lookups. Just highlight text and press Ctrl+Shift+X or ask me directly. I can use dictionary definitions, Wikipedia summaries, or AI-powered explanations to help you understand concepts better.');
        return;
      }
      
      // Check if it's a definition query
      const isDefQuery = query.toLowerCase().match(/^(what|who|define|meaning|definition)/i);
      
      // Try to extract a specific term from quoted text
      if (isDefQuery) {
        var terms = query.match(/["']([^"']+)["']/);
        if (terms && terms[1]) {
          await lookupTerm(terms[1].trim());
          return;
        }
        
        // Try to extract term after "mean", "means", "meaning", "define", etc.
        var words = query.split(/\s+/);
        if (words.length > 2) {
          var termIndex = -1;
          for (var i = 0; i < words.length; i++) {
            if (['mean', 'means', 'meaning', 'define', 'definition', 'of'].includes(words[i].toLowerCase())) {
              termIndex = i + 1;
              break;
            }
          }
          
          if (termIndex > 0 && termIndex < words.length) {
            var potentialTerm = words[termIndex].replace(/[.,?!;:]/g, '');
            await lookupTerm(potentialTerm);
            return;
          }
        }
      }
      
      // If we couldn't identify a specific term or it's not a definition request,
      // use the serverless function for a more conversational response
      await callServer(query);
      
    } catch (e) {
      console.error('Error processing query:', e);
      document.getElementById('lexi-loader').style.display = 'none';
      addMsg('lexi', 'I encountered an error while processing your question. Let\'s try something else?');
    }
  }
  
  // Look up a term through dictionary API first, then fallback to other methods
  async function lookupTerm(term) {
    try {
      // Check cache first
      if (dictCache[term.toLowerCase()]) {
        document.getElementById('lexi-loader').style.display = 'none';
        addMsg('lexi', dictCache[term.toLowerCase()]);
        return;
      }
      
      // Try dictionary API
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
              
              dictCache[term.toLowerCase()] = result;
              document.getElementById('lexi-loader').style.display = 'none';
              addMsg('lexi', result);
              return;
            }
          }
        }
      }
      
      // If dictionary lookup fails, use the server function which will try Wikipedia and LLM
      await callServer(`What does "${term}" mean?`);
      
    } catch (e) {
      console.error('Error in lookupTerm:', e);
      await callServer(`What does "${term}" mean?`);
    }
  }
  
  // Call the serverless function for Wikipedia lookups and LLM responses
  async function callServer(query) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: query })
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      let responseText = data.generated_text || "I'm sorry, I couldn't find an answer to that.";
      
      document.getElementById('lexi-loader').style.display = 'none';
      addMsg('lexi', responseText);
      
    } catch (error) {
      console.error('Error calling server:', error);
      document.getElementById('lexi-loader').style.display = 'none';
      addMsg('lexi', 'I had trouble connecting to my dictionary. Please try again in a moment.');
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
  
  // Show a toast notification
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
  
  // Listen for keyboard shortcut (Ctrl+Shift+X)
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'X') {
      var s = window.getSelection().toString().trim();
      if (s && w && w.parentNode) {
        if (w.dataset.state === 'ultra-minimized') {
          document.getElementById('lexi-min').click();
        }
        
        var now = new Date().getTime();
        if (!w.lastTerm || w.lastTerm.term !== s || (now - w.lastTerm.time) > 1000) {
          w.lastTerm = {term: s, time: now};
          addMsg('user', `What does "${s}" mean?`);
          document.getElementById('lexi-loader').style.display = 'block';
          lookupTerm(s);
        }
      }
    }
  });
  
  // Make widget draggable
  var h = document.getElementById('lexi-header');
  var d = false;
  var ox, oy;
  
  h.onmousedown = function(e) {
    if (e.target.tagName.toLowerCase() === 'button') return;
    d = true;
    w.style.transition = 'none';
    ox = e.clientX - w.getBoundingClientRect().left;
    oy = e.clientY - w.getBoundingClientRect().top;
  };
  
  document.onmousemove = function(e) {
    if (d) {
      w.style.left = (e.clientX - ox) + 'px';
      w.style.top = (e.clientY - oy) + 'px';
    }
  };
  
  document.onmouseup = function() {
    if (d) {
      d = false;
      w.style.transition = 'all 0.3s ease';
    }
  };
  
  // Expose global toggle function
  window.toggleLexi = function() {
    var existingLexi = document.getElementById('lexi-box');
    if (existingLexi) {
      existingLexi.remove();
    } else {
      var script = document.createElement('script');
      script.src = 'lexi-core.js';
      document.body.appendChild(script);
    }
  };
})();