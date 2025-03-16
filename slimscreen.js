document.addEventListener("DOMContentLoaded", function () {
    // Ensure html2canvas is loaded
    if (typeof html2canvas === "undefined") {
        console.error("html2canvas not loaded. Try refreshing the page.");
        return;
    }

    // Create the button
    let captureButton = document.createElement("button");
    captureButton.innerText = "Capture Text";
    captureButton.style.position = "fixed";
    captureButton.style.bottom = "20px";
    captureButton.style.right = "20px";
    captureButton.style.padding = "10px 15px";
    captureButton.style.background = "#4a6bdf";
    captureButton.style.color = "white";
    captureButton.style.border = "none";
    captureButton.style.borderRadius = "5px";
    captureButton.style.cursor = "pointer";
    captureButton.style.zIndex = "10000";
    
    document.body.appendChild(captureButton);

    // Button click to capture selected text
    captureButton.addEventListener("click", function () {
        let selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            alert("Please select some text before capturing.");
            return;
        }

        // Create the popup
        let popup = document.createElement("div");
        popup.className = "slimscreen-popup";
        popup.innerHTML = `
            <div style="position: fixed; bottom: 60px; right: 20px; background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); z-index: 10001; width: 300px;">
                <p><strong>Captured Text:</strong></p>
                <p>${selectedText}</p>
                <button id="close-popup" style="margin-top: 10px; padding: 5px 10px; background: #ff4b4b; color: white; border: none; border-radius: 3px; cursor: pointer;">Close</button>
            </div>
        `;
        document.body.appendChild(popup);

        // Close popup event
        document.getElementById("close-popup").addEventListener("click", function () {
            popup.remove();
        });
    });
});
