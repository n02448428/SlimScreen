// Lexi - Simple Research Assistant
(function() {
  // Track if the widget is loaded and visible
  window.lexiActive = false;
  let widgetElement = null;
  
  // Main toggle function that will be exposed globally
  function toggleLexi() {
    if (!window.lexiActive) {
      createAndShowWidget();
    } else {
      hideWidget();
    }
  }
  
  // Create and display the widget
  function createAndShowWidget() {
    // Create styles if they don't exist
    if (!document.getElementById('lexi-styles')) {
      const styles = document.createElement('style');
      styles.id = 'lexi-styles';
      styles.textContent = `
        #lexi-widget {
          position: fixed;
          top: 20px;
          left: 20px;
          width: 320px;
          background: rgba(22, 25, 37, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: white;
          font-family: Arial, sans-serif;
          border-radius: 10px;
          z-index: 2147483647;
          box-shadow: 0 5px 20px rgba(0,0,0,0.3);
          transition: opacity 0.3s, transform 0.3s;
        }
        
        #lexi-header {
          background: rgba(45, 48, 65, 0.7);
          padding: 10px 15px;
          border-radius: 10px 10px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: move;
        }
        
        #lexi-title {
          font-weight: bold;
        }
        
        #lexi-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 16px;
        }
        
        #lexi-content {
          padding: 15px;
          max-height: 250px;
          overflow-y: auto;
        }
        
        #lexi-input {
          box-sizing: border-box;
          width: 100%;
          padding: 8px 15px;
          border: none;
          border-radius: 0 0 10px 10px;
          background: rgba(45, 48, 65, 0.7);
          color: white;
        }
        
        #lexi-input:focus {
          outline: none;
          background: rgba(55, 58, 75, 0.7);
        }
        
        .lexi-message-user {
          background: rgba(95, 99, 242, 0.2);
          padding: 8px 12px;
          border-radius: 8px 8px 2px 8px;
          margin-bottom: 10px;
          align-self: flex-end;
          max-width: 80%;
          margin-left: auto;
        }
        
        .lexi-message-assistant {
          background: rgba(55, 58, 75, 0.7);
          padding: 8px 12px;
          border-radius: 8px 8px 8px 2px;
          margin-bottom: 10px;
          align-self: flex-start;
          max-width: 80%;
        }
        
        #lexi-loading {
          color: rgba(255,255,255,0.7);
          font-style: italic;
        }
      `;
      document.head.appendChild(styles);
    }
    
    // Create widget if it doesn't exist
    if (!widgetElement) {
      widgetElement = document.createElement('div');
      widgetElement.id = 'lexi-widget';
      widgetElement.innerHTML = `
        <div id="lexi-header">
          <div id="lexi-title">Lexi</div>
          <button id="lexi-close">×</button>
        </div>
        <div id="lexi-content"></div>
        <input id="lexi-input" type="text" placeholder="Ask me anything...">
      `;
      document.body.appendChild(widgetElement);
      
      // Add event listeners
      widgetElement.querySelector('#lexi-close').addEventListener('click', hideWidget);
      
      const input = widgetElement.querySelector('#lexi-input');
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          handleUserInput(input.value);
          input.value = '';
        }
      });
      
      // Make it draggable
      makeDraggable(widgetElement);
      
      // Welcome message
      addMessage('Hello! I\'m Lexi, your research assistant. How can I help you today?', 'assistant');
    }
    
    window.lexiActive = true;
    widgetElement.style.display = 'block';
  }
  
  // Hide the widget
  function hideWidget() {
    if (widgetElement) {
      widgetElement.style.display = 'none';
    }
    window.lexiActive = false;
  }
  
  // Handle user input
  function handleUserInput(text) {
    if (!text.trim()) return;
    
    addMessage(text, 'user');
    showLoading();
    
    // In this simplified version, we'll just echo back what the user said
    setTimeout(() => {
      hideLoading();
      addMessage(`You said: ${text}`, 'assistant');
    }, 500);
  }
  
  // Add a message to the conversation
  function addMessage(text, role) {
    const content = widgetElement.querySelector('#lexi-content');
    const message = document.createElement('div');
    message.className = role === 'user' ? 'lexi-message-user' : 'lexi-message-assistant';
    message.textContent = text;
    content.appendChild(message);
    content.scrollTop = content.scrollHeight;
  }
  
  // Show loading indicator
  function showLoading() {
    const content = widgetElement.querySelector('#lexi-content');
    const loading = document.createElement('div');
    loading.id = 'lexi-loading';
    loading.textContent = 'Thinking...';
    content.appendChild(loading);
    content.scrollTop = content.scrollHeight;
  }
  
  // Hide loading indicator
  function hideLoading() {
    const loading = widgetElement.querySelector('#lexi-loading');
    if (loading) loading.remove();
  }
  
  // Make an element draggable
  function makeDraggable(element) {
    const header = element.querySelector('#lexi-header');
    let isDragging = false;
    let offsetX, offsetY;
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName.toLowerCase() === 'button') return;
      
      isDragging = true;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      
      element.style.left = Math.max(0, x) + 'px';
      element.style.top = Math.max(0, y) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  
  // Setup keyboard shortcut (Ctrl+Shift+X)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'X') {
      const selection = window.getSelection().toString().trim();
      
      if (selection) {
        if (!window.lexiActive) {
          createAndShowWidget();
        }
        
        setTimeout(() => {
          addMessage(`What does this mean: "${selection}"`, 'user');
          showLoading();
          
          setTimeout(() => {
            hideLoading();
            addMessage(`"${selection}" typically refers to something selected on the page. I'd normally provide a definition here, but this is a simplified demo.`, 'assistant');
          }, 1000);
        }, 100);
      }
    }
  });
  
  // Expose the toggle function globally
  window.toggleLexi = toggleLexi;
})();

// Indicate that Lexi has been loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Lexi Research Assistant loaded and ready!');
});