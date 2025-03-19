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
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #lexi-widget {
        position: fixed;
        top: 20px;
        left: 20px;
        width: 320px;
        background: rgba(22, 25, 37, 0.85);
        color: white;
        font-family: Arial, sans-serif;
        border-radius: 10px;
        z-index: 2147483647;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
      }
      #lexi-header {
        padding: 10px;
        background: rgba(45, 48, 65, 0.7);
        border-radius: 10px 10px 0 0;
        display: flex;
        justify-content: space-between;
      }
      #lexi-content {
        padding: 15px;
        height: 200px;
        overflow-y: auto;
      }
      #lexi-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
    
    // Create widget
    widget = document.createElement('div');
    widget.id = 'lexi-widget';
    widget.innerHTML = `
      <div id="lexi-header">
        <span>Lexi</span>
        <button id="lexi-close">×</button>
      </div>
      <div id="lexi-content">
        <p>Hello! I'm Lexi, your friendly research assistant.</p>
      </div>
    `;
    document.body.appendChild(widget);
    
    // Add event listener to close button
    widget.querySelector('#lexi-close').addEventListener('click', hideWidget);
    
    // Initially hide widget
    widget.style.display = 'none';
  }
  
  // Expose toggle function globally
  window.slimScreenToggle = toggleWidget;
})();