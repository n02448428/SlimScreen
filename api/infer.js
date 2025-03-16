const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const apiUrl = 'https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6';
  const token = process.env.HUGGINGFACE_TOKEN; // Securely stored environment variable

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
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy inference failed" });
  }
};
