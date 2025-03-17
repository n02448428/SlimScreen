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

  const apiUrl = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-small';
  const token = process.env.HUGGINGFACE_TOKEN;
  
  // Improved system prompt for friendly female librarian character - separate from user input
  const systemPrompt = "You are a friendly female librarian providing brief, helpful definitions for highlighted words. Respond in about 40-50 words with clear, concise explanations. Include context and usage examples when relevant. Never repeat instructions in your response.";

  if (!token) {
    console.error("HUGGINGFACE_TOKEN is not set in environment variables");
    return res.status(500).json({ error: "API token not configured" });
  }

  if (!req.body || !req.body.inputs) {
    console.error("Missing required 'inputs' field in request body");
    return res.status(400).json({ error: "Missing required 'inputs' field" });
  }

  // Check if the model supports separate system prompts
  let fullPrompt;
  try {
    // Try using the preferred format with separate system and user prompts
    fullPrompt = {
      inputs: {
        system: systemPrompt,
        user: req.body.inputs
      }
    };
  } catch (e) {
    // Fallback to a more controlled prepending with clear separator
    fullPrompt = {
      inputs: `<system>\n${systemPrompt}\n</system>\n\n<user>\n${req.body.inputs}\n</user>\n\n<assistant>\n`
    };
  }

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
      
      // Apply post-processing here on the server side to ensure clean responses
      if (data.generated_text) {
        data.generated_text = cleanResponse(data.generated_text);
      } else if (Array.isArray(data) && data[0]?.generated_text) {
        data[0].generated_text = cleanResponse(data[0].generated_text);
      }
      
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

// Server-side response cleaner
function cleanResponse(text) {
  // First, check if the system prompt is at the beginning
  if (text.includes("You are a friendly female librarian") || 
      text.includes("system") || 
      text.includes("assistant") ||
      text.includes("<user>")) {
      
    // Clean tags and system instructions
    const cleaningPatterns = [
      /<system>[\s\S]*?<\/system>/i,
      /<user>[\s\S]*?<\/user>/i,
      /<assistant>\s*/i,
      /You are a friendly female librarian[\s\S]*?relevant\./i,
      /Never repeat instructions in your response\./i,
      /Your tone is kind and approachable\./i,
      /Keep your responses brief and helpful\./i
    ];
    
    cleaningPatterns.forEach(pattern => {
      text = text.replace(pattern, '');
    });
  }
  
  // Trim and normalize spaces
  text = text.trim().replace(/\s+/g, ' ');
  
  // Ensure we have a response, or provide a fallback
  return text || "I'm here to help with that. Could you provide more context?";
}