(function() {
  let active = false, startX, startY, endX, endY;
  
  // Create UI elements
  const overlay = document.createElement('div');
  overlay.id = 'slim-overlay';
  overlay.style.cssText = 'position:fixed;top:10px;left:10px;background:rgba(0,0,0,0.7);color:white;padding:10px;max-width:300px;display:none;z-index:9999;';
  
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

  // Toggle function
  window.slimScreenToggle = function() {
    active = !active;
    toolbar.textContent = `SlimScreen: ${active ? 'On' : 'Off'}`;
    toolbar.style.display = 'block';
  };

  // Highlighting
  document.addEventListener('mousedown', (e) => {
    if (active && e.ctrlKey) {
      startX = e.clientX; startY = e.clientY;
      highlight.style.display = 'block';
    }
  });
  document.addEventListener('mousemove', (e) => {
    if (startX !== undefined) {
      endX = e.clientX; endY = e.clientY;
      highlight.style.left = Math.min(startX, endX) + 'px';
      highlight.style.top = Math.min(startY, endY) + 'px';
      highlight.style.width = Math.abs(endX - startX) + 'px';
      highlight.style.height = Math.abs(endY - startY) + 'px';
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (startX !== undefined) {
      const text = document.getSelection().toString();
      if (text) analyzeText(text);
      else promptScreenshot();
      highlight.style.display = 'none';
      startX = undefined;
    }
  });

  // Text analysis with Hugging Face
  async function analyzeText(text) {
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/distilbert-base-uncased', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer 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', // Replace with your token
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ inputs: `Explain simply: ${text}` })
      });
      const data = await response.json();
      showOverlay(data[0]?.generated_text || `Words: ${text.split(' ').length}`);
    } catch (e) {
      showOverlay('Error: Try again later');
    }
  }

  // Screenshot prompt
  function promptScreenshot() {
    overlay.innerHTML = 'Paste screenshot (Ctrl+V) for analysis';
    overlay.style.display = 'block';
    document.addEventListener('paste', (e) => {
      const img = e.clipboardData.items[0]?.getAsFile();
      if (img) {
        const reader = new FileReader();
        reader.onload = () => {
          canvas.width = 300; canvas.height = 200;
          const ctx = canvas.getContext('2d');
          const image = new Image();
          image.onload = () => {
            ctx.drawImage(image, 0, 0, 300, 200);
            analyzeImage(canvas.toDataURL());
          };
          image.src = reader.result;
        };
        reader.readAsDataURL(img);
      }
    }, { once: true });
  }

  // Placeholder image analysis
  function analyzeImage(base64) {
    showOverlay('Image analysis coming soon!');
  }

  // Show overlay with options
  function showOverlay(text) {
    const escapedText = text.replace(/'/g, "\\'").replace(/"/g, '\\"');
    overlay.innerHTML = `${text}<br><button id="slim-copy">Copy</button> <button id="slim-save">Save</button> <button id="slim-ask">Ask</button>`;
    overlay.style.display = 'block';
    document.getElementById('slim-copy').onclick = () => navigator.clipboard.writeText(text);
    document.getElementById('slim-save').onclick = () => saveText(text);
    document.getElementById('slim-ask').onclick = askQuestion;
  }

  function saveText(text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = 'insight.txt';
    a.click();
  }

  function askQuestion() {
    const q = prompt('Ask about this:');
    if (q) analyzeText(q);
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
