const fetch = require('node-fetch');
const AbortController = require('abort-controller');

module.exports = async (req, res) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const apiUrl = 'https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-125M';
  const token = process.env.HUGGINGFACE_TOKEN;

  if (!token) {
    console.error("HUGGINGFACE_TOKEN is not set in environment variables");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: "API token not configured" });
  }

  if (!req.body || !req.body.inputs) {
    console.error("Missing required 'inputs' field in request body");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(400).json({ error: "Missing required 'inputs' field" });
  }

  console.log("Received request body:", req.body);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log("Hugging Face response status:", response.status);

    if (response.status === 503) {
      console.error("Model endpoint returned 503 - Service Unavailable");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(503).json({ error: "Model endpoint is temporarily unavailable. Please try again later." });
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonError) {
      console.error("Invalid JSON received:", text);
      throw new Error("Invalid JSON received from Hugging Face");
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    const errorMessage = error.name === 'AbortError' 
      ? "Request timed out after 30 seconds" 
      : error.message;
    res.status(500).json({ error: "Proxy inference failed", details: errorMessage });
  }
};