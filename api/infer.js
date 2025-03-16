const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const apiUrl = 'https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6';
  const token = process.env.HUGGINGFACE_TOKEN; // Ensure your token is set in Vercel

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();

    // Set CORS header before sending the response
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ error: "Proxy inference failed" });
  }
};
