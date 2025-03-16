const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const apiUrl = 'https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6';
  const token = process.env.HUGGINGFACE_TOKEN; // Ensure your token is correct

  console.log("Request body received:", req.body);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    console.log("Hugging Face response status:", response.status);

    // Try to parse the response as JSON
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
    res.status(500).json({ error: "Proxy inference failed", details: error.message });
  }
};
