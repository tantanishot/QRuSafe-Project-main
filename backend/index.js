const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Import CORS package
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 234;

app.use(cors()); // Enable CORS for all requests
app.use(express.json());

// Endpoint to check URL safety using Google Safe Browsing API
app.post('/api/check-url', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const requestBody = {
      client: { clientId: "QRuSafe", clientVersion: "1.0" },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }]
      }
    };

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    console.log("🔍 Checking URL:", url);

    const response = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_API_KEY}`,
      requestBody
    );

    console.log("📩 Safe Browsing API Response:", JSON.stringify(response.data, null, 2));

    let scanResult;
    if (response.data && Object.keys(response.data).length === 0) {
      scanResult = { safe: true, message: "✅ SAFE: This link appears safe." };
    } else {
      scanResult = { safe: false, message: "⚠️ DANGEROUS: This link is flagged!", details: response.data };
    }

    // Automatically print the scan result in the terminal
    console.log("🖥️ Scan Result:", scanResult);

    // Send result back to frontend
    return res.json(scanResult);
  } catch (error) {
    console.error("❌ Error checking URL:", error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
