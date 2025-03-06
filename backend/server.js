//renamed it to server.js for clarity
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 234;

app.use(cors());
app.use(express.json());

// VirusTotal API Check
const checkVirusTotal = async (url) => {
  const API_KEY = process.env.VIRUS_TOTAL_API_KEY;
  
  // Step 1: Submit URL for scanning
  // had to change how to fetch data since 
  //it takes time to generate results since its coming from multiple sources
  const submitResponse = await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
          "x-apikey": API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `url=${encodeURIComponent(url)}`,
  });

  const submitData = await submitResponse.json();

  if (!submitData.data || !submitData.data.id) {
      console.log("Error: Could not submit URL to VirusTotal");
      return null;
  }

  const analysisId = submitData.data.id;

  // Step 2: Wait and Fetch Analysis Results
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

  const resultResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      method: "GET",
      headers: {
          "x-apikey": API_KEY
      }
  });

  const resultData = await resultResponse.json();
  return resultData;
};


// API Endpoint
app.post('/api/check-url', async (req, res) => {
  console.log("Received API Request:", req.body);

  const { url } = req.body;
  if (!url) {
    console.log("No URL provided.");
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Google Safe Browsing Request
    const requestBody = {
      client: { clientId: "QRuSafe", clientVersion: "1.0" },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }]
      }
    };

    console.log("Sending request to Safe Browsing API for:", url);
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const googleResponse = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_API_KEY}`,
      requestBody
    );

    console.log("Safe Browsing API Response:", JSON.stringify(googleResponse.data, null, 2));

    // VirusTotal Check
    console.log("Checking URL with VirusTotal:", url);
    const virusTotalResponse = await checkVirusTotal(url);
    console.log("VirusTotal API Response:", JSON.stringify(virusTotalResponse, null, 2));

    // Check if the URL is flagged as malicious
    //check if either are flagged   
    const isGoogleMalicious = googleResponse.data && googleResponse.data.matches;
    const isVirusTotalMalicious = virusTotalResponse?.data?.attributes?.stats?.malicious > 0;
    

    if (isGoogleMalicious || isVirusTotalMalicious) {
      console.log("URL is flagged as malicious.");
      return res.json({
        safe: false,
        message: "This link is flagged as potentially dangerous.",
        details: {
          google: googleResponse.data || "No data from Google Safe Browsing",
          virustotal: virusTotalResponse || "No data from VirusTotal"
        }
      });
    } else {
      console.log("URL is safe.");
      return res.json({ safe: true, message: "This link appears safe." });
    }

  } catch (error) {
    console.error("Error checking URL:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
