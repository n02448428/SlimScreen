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

        // Process selected text (replace this with your processing logic)
        console.log("Captured text:", selectedText);
        alert("Captured: " + selectedText);
    });
});
