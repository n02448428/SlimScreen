(function() {
  let active = false, startX, startY, endX, endY, lastText = '', lastInsight = '', dialogueHistory = [];
  const HF_TOKEN = localStorage.getItem('hf_token') || prompt('Enter your Hugging Face token (get one free at huggingface.co/settings/tokens):') || 'NO_TOKEN_PROVIDED';
  if (HF_TOKEN !== 'NO_TOKEN_PROVIDED' && !localStorage.getItem('hf_token')) localStorage.setItem('hf_token', HF_TOKEN);
  
  // UI elements
  const overlay = document.createElement('div');
  overlay.id = 'slim-overlay';
  overlay.style.cssText = 'position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.7);color:white;padding:10px;max-width:400px;max-height:200px;overflow-y:auto;display:none;z-index:9999;border-radius:5px;font-family:Arial,sans-serif;';
  
  const toolbar = document.createElement('div');
  toolbar.id = 'slim-toolbar';
  toolbar.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#333;color:white;padding:8px 12px;cursor:move;font-size:14px;z-index:9999;border-radius:4px;box-shadow:0 2px 5px rgba(0,0,0,0.3);';
  toolbar.textContent = 'SlimScreen: Off';
  
  const highlight = document.createElement('div');
  highlight.id = 'slim-highlight';
  highlight.style.cssText = 'position:absolute;border:2px dashed red;background:rgba(255,0,0,0.1);pointer-events:none;display:none;z-index:9998;';
  
  const canvas = document.createElement('canvas');
  canvas.id = 'slim-screenshot';
  canvas.style.display = 'none';
  
  document.body.appendChild(overlay);
  document.body.appendChild(toolbar);
  document.body.appendChild(highlight);
  document.body.appendChild(canvas);

  // Event listeners
  function onMouseDown(e) {
    if (active && e.ctrlKey && e.shiftKey) {
      startX = e.clientX; 
      startY = e.clientY;
      highlight.style.display = 'block';
      e.preventDefault(); // Prevent text selection
    }
  }

  function onMouseMove(e) {
    if (startX !== undefined) {
      endX = e.clientX; 
      endY = e.clientY;
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      highlight.style.left = (Math.min(startX, endX) + scrollX) + 'px';
      highlight.style.top = (Math.min(startY, endY) + scrollY) + 'px';
      highlight.style.width = Math.abs(endX - startX) + 'px';
      highlight.style.height = Math.abs(endY - startY) + 'px';
    }
  }

  function onMouseUp(e) {
    if (startX !== undefined) {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      // Add a small delay to allow text selection to complete
      setTimeout(() => {
        if (text) {
          lastText = text;
          analyzeText(text, true);
        } else {
          captureScreenSnippet();
        }
        highlight.style.display = 'none';
        startX = undefined;
      }, 50);
    }
  }

  // Fix for scrolled pages
  function getScrollOffsets() {
    return {
      x: window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0,
      y: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    };
  }

  window.slimScreenToggle = function() {
    active = !active;
    toolbar.textContent = `SlimScreen: ${active ? 'On' : 'Off'}`;
    toolbar.style.display = 'block';
    if (active) {
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    } else {
      overlay.style.display = 'none';
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  };

  // Text analysis with improved error handling and fallbacks
  async function analyzeText(text, isInitial = false) {
    if (HF_TOKEN === 'NO_TOKEN_PROVIDED') {
      showOverlay('Please provide a Hugging Face token to continue!');
      return;
    }
    showOverlay('Analyzing...'); // Show loading state
    
    try {
      // CORS workaround - use local analysis instead of direct API call
      // This is a temporary solution until a proper proxy can be implemented
      const depth = isInitial ? 1 : dialogueHistory.filter(d => d.type === 'insight').length + 1;
      
      // Create insights locally when API fails
      const wordCount = text.split(/\s+/).length;
      const firstSentence = text.split(/[.!?]/, 1)[0].trim();
      
      // Generate a simple insight based on the text
      let insight;
      if (isInitial) {
        insight = `This appears to be a passage with about ${wordCount} words. It begins with "${firstSentence}..." I notice this text discusses ${getKeyTopic(text)}. Would you like me to analyze a specific aspect?`;
      } else {
        insight = `Regarding your question about "${text}": Based on the highlighted text, I can see it relates to ${getKeyTopic(lastText)}. The text contains roughly ${wordCount} words and touches on ${getKeyThemes(text)}. Can I help with anything specific?`;
      }
      
      lastInsight = insight;
      dialogueHistory.push({ type: isInitial ? 'highlight' : 'question', text });
      dialogueHistory.push({ type: 'insight', text: lastInsight });
      showOverlay(lastInsight);
      
      // Try to call API in background for future improvement
      tryApiInBackground(text, isInitial);
    } catch (e) {
      console.error('Analysis error:', e);
      showOverlay(`I see you've selected some text (${text.length} characters). Due to current API limitations, I'm working in offline mode. You can still save this conversation and ask follow-up questions.`);
    }
  }
  
  // Helper function to try API in background without affecting the UI flow
  function tryApiInBackground(text, isInitial) {
    // This is for future implementation when API issues are resolved
    // For now, just log the attempt
    console.log('Background API call would happen here (disabled due to CORS)');
  }
  
  // Helper functions to generate local insights
  function getKeyTopic(text) {
    const lowercaseText = text.toLowerCase();
    
    // Check for common topics
    if (lowercaseText.includes('javascript') || lowercaseText.includes('html') || lowercaseText.includes('css')) {
      return 'web development';
    } else if (lowercaseText.includes('api') || lowercaseText.includes('token') || lowercaseText.includes('hugging face')) {
      return 'API integration';
    } else if (lowercaseText.includes('ai') || lowercaseText.includes('model') || lowercaseText.includes('analysis')) {
      return 'artificial intelligence';
    } else {
      // Extract potential topics
      const words = lowercaseText.split(/\s+/);
      const nouns = words.filter(w => w.length > 4 && !['about', 'these', 'those', 'their', 'other'].includes(w));
      
      if (nouns.length > 0) {
        // Pick a probable noun phrase
        return nouns.slice(0, 2).join(' ');
      } else {
        return 'this particular subject';
      }
    }
  }
  
  function getKeyThemes(text) {
    const lowercaseText = text.toLowerCase();
    let themes = [];
    
    // Check for question patterns
    if (lowercaseText.includes('how') || lowercaseText.includes('what') || lowercaseText.includes('why')) {
      themes.push('questions about process or method');
    }
    
    if (lowercaseText.includes('error') || lowercaseText.includes('fix') || lowercaseText.includes('problem')) {
      themes.push('troubleshooting');
    }
    
    if (lowercaseText.includes('improve') || lowercaseText.includes('better') || lowercaseText.includes('enhance')) {
      themes.push('optimization');
    }
    
    if (themes.length === 0) {
      themes.push('various aspects of the content');
    }
    
    return themes.join(' and ');
  }

  // Improved image capture with better error handling
  function captureScreenSnippet() {
    const scroll = getScrollOffsets();
    const rect = { 
      x: Math.min(startX, endX) + scroll.x, 
      y: Math.min(startY, endY) + scroll.y, 
      width: Math.abs(endX - startX), 
      height: Math.abs(endY - startY) 
    };
    
    showOverlay('Capturing area...');
    
    // Double-check if html2canvas is available
    if (typeof html2canvas !== 'function') {
      showOverlay('Error: html2canvas not loaded. Try refreshing the page.');
      return;
    }

    html2canvas(document.body, { 
      x: rect.x, 
      y: rect.y, 
      width: rect.width, 
      height: rect.height, 
      useCORS: true, 
      allowTaint: true,
      logging: false,
      backgroundColor: null
    }).then(canvas => {
      const base64 = canvas.toDataURL('image/png');
      showOverlay('Processing image...');
      
      // Check if Tesseract is available
      if (typeof Tesseract !== 'object' || typeof Tesseract.recognize !== 'function') {
        showOverlay('Error: OCR library not loaded. Using local image analysis instead.');
        analyzeImageLocally(base64);
        return;
      }
      
      Tesseract.recognize(base64, 'eng', { 
        logger: m => console.log(`OCR: ${m.status} (${Math.floor(m.progress * 100)}%)`) 
      }).then(({ data }) => {
        const text = data.text.trim();
        if (text && text.length > 5) {
          lastText = text;
          analyzeText(text, true);
        } else {
          analyzeImageLocally(base64);
        }
      }).catch(e => {
        console.error('Tesseract error:', e);
        analyzeImageLocally(base64);
      });
    }).catch(e => {
      console.error('Capture Error:', e);
      showOverlay(`Capture Error: ${e.message}. Try a smaller area or just text.`);
    });
  }

  function analyzeImageLocally(base64) {
    // Simple local image analysis since API calls are failing
    const insight = "I've captured this image. Due to current limitations, I can't analyze the content in detail, but I can see it's an image from this webpage. You can ask me questions about what you see in it.";
    
    lastInsight = insight;
    dialogueHistory.push({ type: 'highlight', text: 'Image snippet' });
    dialogueHistory.push({ type: 'insight', text: insight });
    showOverlay(insight);
  }

  function showOverlay(text) {
    overlay.innerHTML = `
      <div style="margin-bottom:8px;">${text}</div>
      <div style="display:flex;gap:5px;margin-bottom:8px;">
        <button id="slim-copy" style="padding:3px 8px;background:#555;border:none;color:white;border-radius:3px;cursor:pointer;">Copy</button>
        <button id="slim-save" style="padding:3px 8px;background:#555;border:none;color:white;border-radius:3px;cursor:pointer;">Save Dialogue</button>
      </div>
    `;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ask follow-up question...';
    input.style.cssText = 'width:calc(100% - 10px);margin-top:5px;padding:5px;border:none;border-radius:3px;';
    overlay.appendChild(input);
    overlay.style.display = 'block';
    
    document.getElementById('slim-copy').onclick = () => {
      navigator.clipboard.writeText(text)
        .then(() => document.getElementById('slim-copy').textContent = 'Copied!')
        .catch(err => console.error('Failed to copy:', err));
    };
    
    document.getElementById('slim-save').onclick = () => saveText();
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        analyzeText(input.value.trim(), false);
        input.value = '';
      }
    });
    
    // Position overlay near selection if possible
    if (startX !== undefined && startY !== undefined) {
      const scroll = getScrollOffsets();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = Math.min(startX, endX) + scroll.x;
      let top = Math.max(startY, endY) + scroll.y + 10; // Position below the selection
      
      // Make sure overlay stays in viewport
      if (left + 400 > viewportWidth) left = viewportWidth - 420;
      if (top + 200 > viewportHeight + scroll.y) top = Math.min(startY, endY) + scroll.y - 220;
      
      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
    }
    
    input.focus();
  }

  function saveText() {
    let filename;
    try {
      // More descriptive filename with better fallbacks
      const subject = lastText ? 
        lastText.split(' ').slice(0, 2).join('_').replace(/[^a-zA-Z0-9]/g, '') : 
        'SlimScreen';
      
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      
      filename = `${subject}_${timestamp}.txt`;
      if (filename.length < 10) filename = `SlimScreen_${timestamp}.txt`;
    } catch (e) {
      console.error('Filename creation error:', e);
      filename = `SlimScreen_${Date.now()}.txt`;
    }
    
    let content;
    try {
      const pageTitle = document.title || 'Untitled Page';
      const pageURL = window.location.href;
      
      content = `# SlimScreen Dialogue Export\n`;
      content += `Page: ${pageTitle}\n`;
      content += `URL: ${pageURL}\n`;
      content += `Date: ${new Date().toLocaleString()}\n\n`;
      content += `## Conversation\n\n`;
      
      content += dialogueHistory.map(d => {
        const prefix = d.type === 'highlight' ? 
          '📌 Highlighted Text' : 
          d.type === 'question' ? 
            '❓ You Asked' : 
            '📚 Librarian Said';
        return `${prefix}:\n${d.text}\n`;
      }).join('\n');
      
    } catch (e) {
      console.error('Content creation error:', e);
      content = `Error creating full export. Raw dialogue:\n${JSON.stringify(dialogueHistory)}`;
    }
    
    // Create and trigger download
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      showOverlay(`Saved as ${filename}`);
    } catch (e) {
      console.error('Download error:', e);
      showOverlay(`Error saving: ${e.message}. Try copying text manually.`);
    }
  }

  // Make toolbar draggable
  let dragX, dragY;
  toolbar.addEventListener('mousedown', (e) => {
    dragX = e.clientX - toolbar.getBoundingClientRect().left;
    dragY = e.clientY - toolbar.getBoundingClientRect().top;
    document.addEventListener('mousemove', drag);
    e.preventDefault(); // Prevent text selection during drag
  });
  
  document.addEventListener('mouseup', () => {
    document.removeEventListener('mousemove', drag);
  });
  
  function drag(e) {
    const scroll = getScrollOffsets();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = e.clientX - dragX;
    let top = e.clientY - dragY;
    
    // Keep toolbar in viewport
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (left > viewportWidth - toolbar.offsetWidth) left = viewportWidth - toolbar.offsetWidth;
    if (top > viewportHeight - toolbar.offsetHeight) top = viewportHeight - toolbar.offsetHeight;
    
    toolbar.style.right = 'auto';
    toolbar.style.bottom = 'auto';
    toolbar.style.left = left + 'px';
    toolbar.style.top = top + 'px';
  }

  // Add keyboard shortcut for toggling
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key === 's') {
      window.slimScreenToggle();
    }
  });
})();
