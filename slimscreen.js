// Rename this file to slimscreen.js
(function() {
  // Track widget state
  let widgetVisible = false;
  let widget = null;
  
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
            fetchDefinition(t);
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
            fetchDefinition(s);
          }
        }
      }
    });
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
  
  // Fetch definition from dictionary API
  async function fetchDefinition(term) {
    try {
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
              
              document.getElementById('lexi-loader').style.display = 'none';
              addMsg('lexi', result);
              return;
            }
          }
        }
      }
      
      // If dictionary API fails, use a simple fallback
      document.getElementById('lexi-loader').style.display = 'none';
      addMsg('lexi', `I'm sorry, I couldn't find a definition for "${term}". Try asking in a different way or check the spelling.`);
      
    } catch (e) {
      console.error('Error in fetchDefinition:', e);
      document.getElementById('lexi-loader').style.display = 'none';
      addMsg('lexi', `I had trouble looking up "${term}". My dictionary seems to be temporarily unavailable. Let's try again in a moment.`);
    }
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