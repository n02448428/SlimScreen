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

  const apiUrl = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
  const token = process.env.HUGGINGFACE_TOKEN;
  
  if (!token) {
    console.error("HUGGINGFACE_TOKEN is not set in environment variables");
    return res.status(500).json({ error: "API token not configured" });
  }

  if (!req.body || !req.body.inputs) {
    console.error("Missing required 'inputs' field in request body");
    return res.status(400).json({ error: "Missing required 'inputs' field" });
  }

  // Format the prompt for Lexi
  const userInput = req.body.inputs.trim();
  
  // Check if this is a definition request
  const isDefinitionRequest = userInput.toLowerCase().includes("what does this mean") || 
                             userInput.toLowerCase().includes("define") ||
                             userInput.toLowerCase().includes("meaning of");
  
  // Different prompt templates based on request type
  let formattedPrompt;
  
  if (isDefinitionRequest) {
    // Extract the term being defined (if possible)
    const termMatch = userInput.match(/(?:what does this mean|define|meaning of)[: ]+"([^"]+)"/i);
    const term = termMatch ? termMatch[1] : "";
    
    formattedPrompt = `You are Lexi, a helpful research assistant. 
    Provide a clear, concise definition (1-2 sentences) for this term: "${term}"
    Be straightforward and precise in your explanation.`;
  } else {
    // General conversation prompt
    formattedPrompt = `You are Lexi, a helpful research assistant providing concise information. 
    Reply to this in a natural, concise way (1-2 sentences): "${userInput}"`;
  }
  
  const payload = {
    inputs: formattedPrompt,
    parameters: {
      max_length: 100,      // Limit response length
      temperature: 0.6,     // Add some randomness but not too much
      top_k: 40,            // Consider top 40 tokens
      top_p: 0.9,           // Use nucleus sampling
      do_sample: true       // Enable sampling
    }
  };

  console.log("Processing request with prompt:", formattedPrompt);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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
    console.log("Hugging Face response status:", response.status);

    if (response.status === 503) {
      console.error("Model endpoint returned 503 - Service Unavailable");
      return res.status(200).json({ 
        generated_text: "I'm currently processing many requests. Could you try again in a moment?" 
      });
    }

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.error("Response body:", responseText);
      return res.status(200).json({ 
        generated_text: "I understand your question, but I'm having trouble accessing my knowledge. Can you rephrase or try again?" 
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
      ? "Request processing took too long. Could you try a simpler question?" 
      : error.message;
    return res.status(200).json({ 
      generated_text: "I understand your question, but I'm having technical difficulties. Please try again in a moment."
    });
  }
};

// Improved response cleaner
function cleanResponse(text) {
  if (!text) return "I understand your question, but need more specific context.";
  
  // Remove prompt remnants and system instructions
  const cleaningPatterns = [
    // Remove prompt structures
    /You are Lexi[^"]*"([^"]*)"/i,
    /Define this concisely[^:]*:/i,
    /\[\s*Context:[^\]]*\]/gi,
    /Provide a clear, concise definition[^.]*\./i,
    /Be straightforward and precise[^.]*\./i,
    
    // Remove system and XML tags
    /<s>[\s\S]*?<\/system>/gi,
    /<user>[\s\S]*?<\/user>/gi,
    /<assistant>[\s\S]*?<\/assistant>/gi,
    /<assistant>\s*/gi,
    
    // Remove instruction patterns
    /You are (a )?(friendly|helpful) (librarian|research assistant)[^.]*/gi,
    /Reply to this in a natural, concise way[^.]*\./gi,
    /Provide a concise[^.]*\./gi,
    /Focus only on[^.]*\./gi, 
    /Be warm but efficient[^.]*\./gi,
    
    // Remove reference artifacts
    /Wikipedia, the free encyclopedia"?\]/gi,
    /Define this concisely \(max \d+ sentences\):/gi,
    /Give a clear, brief explanation[^.]*/gi,
  ];
  
  let cleaned = text;
  
  // Apply all cleaning patterns
  cleaningPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove strange artifacts and phrases
  const strangePatterns = [
    /It is not my face, but a face that bothers me\./g,
    /To a space, a space adjacent to hello\./g,
    /For the past 14 years\./g,
    /Your book's digital RSS feed\./g,
    /FANT[A-Za-z]+::[^;]*;/g,
    /Result = [^;]*;/g,
    /DONT forget about receipts/g,
    /Urban journals\./g,
    /I'm here to help with that\. Could you provide more context\?/g,
    /I'll help you understand this\./g,
    /According to Wikipedia/gi,
    /Let me find information about/gi
  ];
  
  strangePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Clean whitespace and normalize
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  // Ensure proper formatting
  if (cleaned && cleaned.length > 0) {
    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    // Add period if missing
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }
  }
  
  // Fallback if we've removed too much
  if (!cleaned || cleaned.length < 5) {
    return "This refers to a concept that requires specific context. Could you provide more details?";
  }
  
  return cleaned;
}