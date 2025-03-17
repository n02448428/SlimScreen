const fetch = require('node-fetch');
const AbortController = require('abort-controller');

module.exports = async (req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiUrl = 'https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-2.7B';
  const token = process.env.HUGGINGFACE_TOKEN;
  
  // System prompt moved to server-side only to prevent leakage
  const librarianInstruction = "You are a warm, friendly, and polite female librarian who always provides clear definitions, context, and concise insights. Never use bad words. Keep your responses brief unless follow-ups are requested. RESPOND ONLY WITH NATURAL LANGUAGE. DO NOT OUTPUT CODE OR TECHNICAL ARTIFACTS. ";

  if (!token) {
    console.error("HUGGINGFACE_TOKEN is not set in environment variables");
    return res.status(500).json({ error: "API token not configured" });
  }

  if (!req.body || !req.body.inputs) {
    console.error("Missing required 'inputs' field in request body");
    return res.status(400).json({ error: "Missing required 'inputs' field" });
  }

  // Prepend the system instruction to the user's input
  const fullPrompt = {
    inputs: librarianInstruction + req.body.inputs
  };

  console.log("Processing request with sanitized prompt");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fullPrompt),
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log("Hugging Face response status:", response.status);

    if (response.status === 503) {
      console.error("Model endpoint returned 503 - Service Unavailable");
      return res.status(503).json({ error: "Model endpoint is temporarily unavailable. Please try again later." });
    }

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({ 
        error: `Hugging Face API error: ${response.statusText}` 
      });
    }

    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (jsonError) {
      console.error("Invalid JSON received:", jsonError);
      return res.status(500).json({ error: "Invalid response received from Hugging Face" });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    const errorMessage = error.name === 'AbortError' 
      ? "Request timed out after 25 seconds" 
      : error.message;
    return res.status(500).json({ error: "Proxy inference failed", details: errorMessage });
  }
};