// Simplified serverless function for SlimScreen's Lexi assistant
// This can be deployed as an API route on Vercel, Netlify, or other serverless platforms

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

  // Validate request
  if (!req.body || !req.body.inputs) {
    return res.status(400).json({ error: "Missing required 'inputs' field" });
  }
  
  const apiUrl = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
  const token = process.env.HUGGINGFACE_TOKEN;
  
  if (!token) {
    console.error("HUGGINGFACE_TOKEN is not set in environment variables");
    return res.status(500).json({ error: "API token not configured" });
  }

  // Format the prompt for Lexi's personality
  const userInput = req.body.inputs.trim();
  
  // More specific and concise prompt for Lexi
  const formattedPrompt = `You are Lexi, a helpful research assistant providing concise information. 
  Give a clear, brief explanation (1-2 sentences max) for: "${userInput}"`;
  
  const payload = {
    inputs: formattedPrompt,
    parameters: {
      max_length: 75,      // Shorter responses for conciseness
      temperature: 0.6,     // Less randomness for more consistent answers
      top_k: 40,            // Consider top 40 tokens
      top_p: 0.9,           // Use nucleus sampling
      do_sample: true       // Enable sampling
    }
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8-second timeout

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.status === 503) {
      return res.status(503).json({ 
        error: "Service temporarily unavailable. Try again shortly." 
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `API error: ${response.statusText}` 
      });
    }

    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
      
      // Apply post-processing for conciseness
      if (data.generated_text) {
        data.generated_text = cleanResponse(data.generated_text);
      } else if (Array.isArray(data) && data[0]?.generated_text) {
        data[0].generated_text = cleanResponse(data[0].generated_text);
      }
      
    } catch (jsonError) {
      return res.status(500).json({ error: "Invalid response received" });
    }

    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.name === 'AbortError' 
      ? "Request timed out" 
      : error.message;
    return res.status(500).json({ error: errorMessage });
  }
};

// Improved response cleaner for conciseness
function cleanResponse(text) {
  if (!text) return "I understand. Could you clarify what you'd like to know?";
  
  // Remove prompt remnants and system instructions
  const cleaningPatterns = [
    /You are Lexi[^"]*: "([^"]*)"/i,
    /<system>[\s\S]*?<\/system>/i,
    /<user>[\s\S]*?<\/user>/i,
    /<assistant>[\s\S]*?/i,
    /Give a clear, brief explanation[^.]*\./i,
    /You are a helpful research assistant[^.]*\./i
  ];
  
  let cleaned = text;
  
  // Apply cleaning patterns
  cleaningPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove known bad responses
  const badResponses = [
    "I'll help you understand this.",
    "Let me explain this for you.",
    "It is not my face, but a face that bothers me",
    "To a space, a space adjacent to hello",
    "For the past 14 years",
    "Your book's digital RSS feed"
  ];
  
  for (const badResponse of badResponses) {
    if (cleaned.includes(badResponse)) {
      if (badResponse.includes("help you understand")) {
        return "Here's a simple explanation:";
      }
      if (badResponse.includes("explain this for you")) {
        return "Simply put:";
      }
      // For other strange responses, provide reasonable defaults
      return "I understand your question. Here's what you need to know:";
    }
  }
  
  // Clean whitespace and normalize
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  // Force brevity - limit to two sentences for consistency
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length > 2) {
    cleaned = sentences.slice(0, 2).join(' ');
  }
  
  // Ensure the response is well-formed
  if (cleaned && cleaned.length > 0) {
    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    // Add period if missing
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }
  }
  
  // Fallback for empty or too-short responses
  if (!cleaned || cleaned.length < 5) {
    return "This refers to a concept I'll need to explore more with you. Could you provide additional context?";
  }
  
  return cleaned;
}