(function() {
  let active = false, startX, startY, endX, endY, lastText = '', lastInsight = '', dialogueHistory = [];
  
  // Create UI elements
  const overlay = document.createElement('div');
  overlay.id = 'slim-overlay';
  overlay.style.cssText = 'position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.7);color:white;padding:10px;max-width:400px;display:none;z-index:9999;';
  
  const toolbar = document.createElement('div');
  toolbar.id = 'slim-toolbar';
  toolbar.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#333;color:white;padding:5px;cursor:move;font-size:14px;z-index:9999;';
  toolbar.textContent = 'SlimScreen: Off';
  
  const highlight = document.createElement('div');
  highlight.id = 'slim-highlight';
  highlight.style.cssText = 'position:fixed;border:2px dashed red;pointer-events:none;display:none;z-index:9998;';
  
  const canvas = document.createElement('canvas');
  canvas.id = 'slim-screenshot';
  canvas.style.display = 'none';
  
  document.body.appendChild(overlay);
  document.body.appendChild(toolbar);
  document.body.appendChild(highlight);
  document.body.appendChild(canvas);

  // Toggle function
  window.slimScreenToggle = function() {
    active = !active;
    toolbar.textContent = `SlimScreen: ${active ? 'On' : 'Off'}`;
    toolbar.style.display = 'block';
  };

  // Highlighting with Ctrl + Shift
  document.addEventListener('mousedown', (e) => {
    if (active && e.ctrlKey && e.shiftKey) {
      startX = e.clientX; startY = e.clientY;
      highlight.style.display = 'block';
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (startX !== undefined) {
      endX = e.clientX; endY = e.clientY;
      highlight.style.left = (Math.min(startX, endX) + window.scrollX) + 'px';
      highlight.style.top = (Math.min(startY, endY) + window.scrollY) + 'px';
      highlight.style.width = Math.abs(endX - startX) + 'px';
      highlight.style.height = Math.abs(endY - startY) + 'px';
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (startX !== undefined) {
      const text = document.getSelection().toString().trim();
      if (text) {
        lastText = text;
        analyzeText(text, true);
      } else {
        captureScreenSnippet();
      }
      highlight.style.display = 'none';
      startX = undefined;
    }
  });

  // Text analysis with Hugging Face (google/flan-t5-base)
  async function analyzeText(text, isInitial = false) {
    try {
      const depth = isInitial ? 1 : dialogueHistory.filter(d => d.type === 'insight').length + 1;
      const prompt = isInitial 
        ? `Explain in detail: ${text}`
        : `Based on "${lastText}", elaborate more on "${text}" (conversation depth: ${depth})`;
      const response = await fetch('https://api-inference.huggingface.co/models/google/flan-t5-base', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer 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', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ inputs: prompt })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const insight = Array.isArray(data) ? data[0]?.generated_text : 'No insight available';
      lastInsight = insight || `Words: ${text.split(' ').length}`;
      dialogueHistory.push({ type: isInitial ? 'highlight' : 'question', text });
      dialogueHistory.push({ type: 'insight', text: lastInsight });
      showOverlay(lastInsight);
    } catch (e) {
      showOverlay(`Error: ${e.message}`);
    }
  }

  // Capture screen snippet
  function captureScreenSnippet() {
    const rect = { 
      x: Math.min(startX, endX) + window.scrollX, 
      y: Math.min(startY, endY) + window.scrollY, 
      width: Math.abs(endX - startX), 
      height: Math.abs(endY - startY) 
    };
    html2canvas(document.body, { 
      x: rect.x, 
      y: rect.y, 
      width: rect.width, 
      height: rect.height, 
      useCORS: true, 
      logging: true 
    }).then(canvas => {
      const base64 = canvas.toDataURL('image/png');
      Tesseract.recognize(base64, 'eng').then(({ data }) => {
        const text = data.text.trim();
        if (text) {
          lastText = text;
          analyzeText(text, true);
        } else {
          analyzeImage(base64);
        }
      }).catch(e => {
        console.error('Tesseract error:', e);
        analyzeImage(base64);
      });
    }).catch(e => showOverlay(`Capture Error: ${e.message}`));
  }

  // Image analysis with Hugging Face CLIP
  async function analyzeImage(base64) {
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer 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', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ inputs: base64 })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const insight = Array.isArray(data) ? data[0]?.generated_text : 'Image: No text or details detected';
      lastInsight = insight;
      dialogueHistory.push({ type: 'highlight', text: 'Image snippet' });
      dialogueHistory.push({ type: 'insight', text: insight });
      showOverlay(insight);
    } catch (e) {
      showOverlay(`Image Error: ${e.message}`);
    }
  }

  // Show overlay with auto-ask input
  function showOverlay(text) {
    overlay.innerHTML = `${text}<br><button id="slim-copy">Copy</button> <button id="slim-save">Save</button>`;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ask me anything about: ' + lastText.slice(0, 20) + '...';
    input.style.cssText = 'width:90%;margin-top:5px;padding:2px;';
    overlay.appendChild(input);
    overlay.style.display = 'block';
    document.getElementById('slim-copy').onclick = () => navigator.clipboard.writeText(text);
    document.getElementById('slim-save').onclick = () => saveText();
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && input.value) {
        analyzeText(input.value, false);
      }
    };
  }

  function saveText() {
    const dialogue = dialogueHistory.map(d => `${d.type === 'highlight' ? 'Highlighted' : d.type === 'question' ? 'You Asked' : 'Insight'}: ${d.text}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dialogue], { type: 'text/plain' }));
    a.download = 'slimscreen_full_dialogue.txt';
    a.click();
  }

  // Draggable toolbar
  let dragX, dragY;
  toolbar.addEventListener('mousedown', (e) => {
    dragX = e.clientX - toolbar.offsetLeft;
    dragY = e.clientY - toolbar.offsetTop;
    document.addEventListener('mousemove', drag);
  });
  document.addEventListener('mouseup', () => document.removeEventListener('mousemove', drag));
  function drag(e) {
    toolbar.style.right = 'auto';
    toolbar.style.left = (e.clientX - dragX) + 'px';
    toolbar.style.top = (e.clientY - dragY) + 'px';
  }
})();
