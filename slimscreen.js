(function() {
  let active = false, startX, startY, endX, endY, lastText = '', lastInsight = '', dialogueHistory = [];
  
  // Create UI elements
  const overlay = document.createElement('div');
  overlay.id = 'slim-overlay';
  overlay.style.cssText = 'position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.7);color:white;padding:10px;max-width:400px;max-height:200px;overflow-y:auto;display:none;z-index:9999;';
  
  const toolbar = document.createElement('div');
  toolbar.id = 'slim-toolbar';
  toolbar.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#333;color:white;padding:5px;cursor:move;font-size:14px;z-index:9999;';
  toolbar.textContent = 'SlimScreen: Off';
  
  const highlight = document.createElement('div');
  highlight.id = 'slim-highlight';
  highlight.style.cssText = 'position:absolute;border:2px dashed red;pointer-events:none;display:none;z-index:9998;';
  
  const canvas = document.createElement('canvas');
  canvas.id = 'slim-screenshot';
  canvas.style.display = 'none';
  
  document.body.appendChild(overlay);
  document.body.appendChild(toolbar);
  document.body.appendChild(highlight);
  document.body.appendChild(canvas);

  // Event listener functions
  function onMouseDown(e) {
    if (active && e.ctrlKey && e.shiftKey) {
      startX = e.clientX; startY = e.clientY;
      highlight.style.display = 'block';
    }
  }

  function onMouseMove(e) {
    if (startX !== undefined) {
      endX = e.clientX; endY = e.clientY;
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
  }

  // Toggle function
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

  // Text analysis with Hugging Face (EleutherAI/gpt-neo-125m)
  async function analyzeText(text, isInitial = false) {
    try {
      const depth = isInitial ? 1 : dialogueHistory.filter(d => d.type === 'insight').length + 1;
      const prompt = isInitial 
        ? `Hello! Explain this like a friendly librarian would: ${text}`
        : `Hi again! Based on "${lastText}", tell me more about "${text}" like a kind librarian (step ${depth})`;
      const response = await fetch('https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-125m', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer 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', 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ inputs: prompt, parameters: { max_length: 150, temperature: 0.7 } })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const insight = Array.isArray(data) ? data[0]?.generated_text : 'No insight available';
      lastInsight = insight || `Words: ${text.split(' ').length}`;
      dialogueHistory.push({ type: isInitial ? 'highlight' : 'question', text });
      dialogueHistory.push({ type: 'insight', text: lastInsight });
      showOverlay(lastInsight);
    } catch (e) {
      showOverlay(`Error: ${e.message} - Try again soon!`);
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
      Tesseract.recognize(base64, 'eng', { logger: m => console.log(m) }).then(({ data }) => {
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
      const insight = Array.isArray(data) ? data[0]?.generated_text : 'Image: No details detected';
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
    input.placeholder = 'Ask me anything: ' + lastText.slice(0, 20) + '...';
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
    input.focus();
  }

  function saveText() {
    const subject = lastText.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `${subject}_${timestamp}.txt`;
    const dialogue = dialogueHistory.map(d => `${d.type === 'highlight' ? 'Highlighted' : d.type === 'question' ? 'You Asked' : 'Librarian Said'}: ${d.text}`).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dialogue], { type: 'text/plain' }));
    a.download = filename;
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
