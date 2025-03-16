// Immediately-invoked function to isolate our scope
(function() {
  // --- Widget Injection for Any Page ---
  function ensureWidget() {
    let widget = document.getElementById('librarian-widget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'librarian-widget';
      widget.style.position = 'fixed';
      widget.style.top = '10px';
      widget.style.left = '10px';
      widget.style.width = '300px';
      widget.style.background = '#fff';
      widget.style.border = '1px solid #ccc';
      widget.style.borderRadius = '8px';
      widget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
      widget.style.zIndex = '9999';
      widget.style.fontFamily = 'sans-serif';
      widget.style.transition = 'width 0.3s, height 0.3s';
      widget.style.display = 'none';
      widget.innerHTML = `
        <div id="widget-header" style="cursor: move; padding: 10px; background: #f7f7f7; border-bottom: 1px solid #ccc;">
          <strong>Librarian</strong>
          <button id="widget-close" style="float: right;">X</button>
        </div>
        <div id="conversation" style="max-height: 200px; overflow-y: auto; padding: 10px; font-size: 0.9em;"></div>
        <input id="user-input" type="text" placeholder="Ask a follow-up question..." style="width: calc(100% - 20px); margin: 10px; padding: 5px;" />
        <div id="widget-buttons" style="padding: 0 10px 10px;">
          <button id="copy-conversation">Copy Conversation</button>
          <button id="save-conversation">Save Conversation</button>
        </div>
      `;
      document.body.appendChild(widget);
      setupWidget(widget);
    }
  }

  // --- Setup Widget Events (Draggable, Close, etc.) ---
  function setupWidget(widget) {
    const header = widget.querySelector('#widget-header');
    let isDragging = false, offsetX, offsetY;
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - widget.offsetLeft;
      offsetY = e.clientY - widget.offsetTop;
    });
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        widget.style.left = (e.clientX - offsetX) + 'px';
        widget.style.top = (e.clientY - offsetY) + 'px';
      }
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
    widget.querySelector('#widget-close').addEventListener('click', () => {
      widget.style.display = 'none';
      updateBookmarkletText("Off");
    });
    setupCopySave(widget);
    setupInputHandler(widget);
  }

  // --- Setup Copy/Save Functions ---
  let conversationHistory = [];
  function setupCopySave(widget) {
    const copyBtn = widget.querySelector('#copy-conversation');
    const saveBtn = widget.querySelector('#save-conversation');
    copyBtn.addEventListener('click', () => {
      if (conversationHistory.length === 0) {
        alert('No conversation to copy.');
        return;
      }
      const allText = conversationHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
      navigator.clipboard.writeText(allText).catch(err => {
        alert('Clipboard write not allowed.');
      });
    });
    saveBtn.addEventListener('click', () => {
      if (conversationHistory.length === 0) {
        alert('No conversation to save.');
        return;
      }
      const allText = conversationHistory.map(m => `${m.sender}: ${m.text}`).join('\n');
      const blob = new Blob([allText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conversation.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // --- Setup Input Field for Follow-Up Questions ---
  function setupInputHandler(widget) {
    const userInput = widget.querySelector('#user-input');
    userInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const query = userInput.value.trim();
        if (query) {
          appendMessage('User', query);
          userInput.value = '';
          const result = await runOnlineInference(query);
          handleResult(result);
        }
      }
    });
  }

  // --- Global Toggle Function ---
  window.slimScreenToggle = function() {
    ensureWidget();
    const widget = document.getElementById('librarian-widget');
    if (widget.style.display === 'none' || widget.style.display === '') {
      widget.style.display = 'block';
      updateBookmarkletText("On");
    } else {
      widget.style.display = 'none';
      updateBookmarkletText("Off");
    }
  };

  function updateBookmarkletText(state) {
    const bm = document.getElementById('bookmarklet');
    if (bm) bm.textContent = `SlimScreen: ${state}`;
  }

  // --- Conversation Logging ---
  function appendMessage(sender, text) {
    conversationHistory.push({ sender, text });
    const convDiv = document.getElementById('conversation');
    if (convDiv) {
      const msg = document.createElement('div');
      msg.textContent = `${sender}: ${text}`;
      convDiv.appendChild(msg);
      convDiv.scrollTop = convDiv.scrollHeight;
    }
  }

  // --- Online Inference ---
  const librarianInstruction = "You are a warm, friendly, and polite female librarian who always provides clear definitions, context, and concise insights. Never use bad words. Keep your responses brief unless follow-ups are requested.";
  async function runOnlineInference(text) {
    const prompt = librarianInstruction + " " + text;
    try {
      const response = await fetch('https://slim-screen.vercel.app/api/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Network response was not ok");
      return result;
    } catch (error) {
      console.error("Online inference error:", error);
      return { error: error.message };
    }
  }

  function handleResult(result) {
    if (result.error) {
      appendMessage('Librarian', result.error);
    } else if (Array.isArray(result) && result[0].generated_text) {
      appendMessage('Librarian', result[0].generated_text);
    } else if (result.generated_text) {
      appendMessage('Librarian', result.generated_text);
    } else {
      appendMessage('Librarian', JSON.stringify(result));
    }
  }

  // --- Hotkey for Highlighted Text (Ctrl+Shift+X) ---
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') {
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        appendMessage('User', selectedText);
        const result = await runOnlineInference(selectedText);
        handleResult(result);
      } else {
        alert('No text selected!');
      }
    }
  });
})();
