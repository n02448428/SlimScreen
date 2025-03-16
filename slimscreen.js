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
      const depth = isInitial ? 1 : dialogueHistory.filter(d => d.type === 'insight').length + 1;
      const prompt = isInitial 
        ? `Summarize this briefly in a warm, librarian-like tone (about 50 words): ${text}`
        : `Based on "${lastText.substring(0, 100)}...", explain "${text}" in a kind, concise librarian tone (step ${depth})`;
      
      let models = [
        'EleutherAI/gpt-neo-125m',
        'distilbert-base-uncased',
        'facebook/bart-large-cnn'
      ];
      
      let insight = null;
      
      // Try models in sequence until one works
      for (let model of models) {
        try {
          const url = `https://api-inference.huggingface.co/models/${model}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${HF_TOKEN}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
              inputs: prompt, 
              parameters: { max_length: 75, temperature: 0.7 } 
            })
          });
          
          if (!response.ok) {
            console.warn(`Model ${model} returned ${response.status}`);
            continue; // Try next model
          }
          
          const data = await response.json();
          insight = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
          if (insight) break; // Got a valid response
        } catch (modelError) {
          console.warn(`Error with model ${model}:`, modelError);
          // Continue to next model
        }
      }
      
      // Fallback if all models failed
      if (!insight) {
        insight = `Words: ${text.split(' ').length} | Characters: ${text.length} | First bit: "${text.substring(0, 30)}..."`;
      }
      
      lastInsight = insight;
      dialogueHistory.push({ type: isInitial ? 'highlight' : 'question', text });
      dialogueHistory.push({ type: 'insight', text: lastInsight });
      showOverlay(lastInsight);
    } catch (e) {
      console.error('Analysis error:', e);
      showOverlay(`Error: ${e.message} - Check token or try later! Fallback: Text is ${text.length} characters long.`);
    }
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
        showOverlay('Error: OCR library not loaded. Trying image analysis instead.');
        analyzeImage(base64);
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
          analyzeImage(base64);
        }
      }).catch(e => {
        console.error('Tesseract error:', e);
        analyzeImage(base64);
      });
    }).catch(e => {
      console.error('Capture Error:', e);
      showOverlay(`Capture Error: ${e.message}. Try a smaller area or just text.`);
    });
  }

  async function analyzeImage(base64) {
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${HF_TOKEN}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ inputs: { image: base64 } })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle CLIP model response structure
      let insight = 'Image: No details detected';
      if (data && Array.isArray(data)) {
        const labels = data.map(item => item.label);
        insight = `I see an image that might contain: ${labels.slice(0, 3).join(', ')}`;
      } else if (data && data.label) {
        insight = `I see an image that might be: ${data.label}`;
      }
      
      lastInsight = insight;
      dialogueHistory.push({ type: 'highlight', text: 'Image snippet' });
      dialogueHistory.push({ type: 'insight', text: insight });
      showOverlay(insight);
    } catch (e) {
      console.error('Image analysis error:', e);
      showOverlay(`Image Error: ${e.message}. Try text selection instead.`);
    }
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
    input.style.cssText = 'width:100%;margin-top:5px;padding:5px;border:none;border-radius:3px;';
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
