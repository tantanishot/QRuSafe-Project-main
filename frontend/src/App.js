import React, { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import axios from "axios";
import "./App.css";

function App() {
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false); // New state to show scanning progress
  const scannerRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    if (scanning && readerRef.current) {
      const config = { fps: 10, qrbox: 250 };
      const verbose = false;
      const html5QrcodeScanner = new Html5QrcodeScanner("reader", config, verbose);
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = html5QrcodeScanner;
    }
  }, [scanning]);

  const startScanner = () => {
    setScanning(true);
  };

  const onScanSuccess = (decodedText) => {
    if (scannerRef.current) {
      scannerRef.current.clear()
        .then(() => console.log("Scanner stopped after successful scan"))
        .catch((error) => console.error("Failed to stop scanner:", error));
    }
    
    setScanning(false);
    checkUrlSafety(decodedText);
  };

  const onScanFailure = (error) => {
    console.warn(`QR Code scan error: ${error}`);
  };

  const checkUrlSafety = async (url) => {
    setLoading(true);  // Show "Scanning in progress..."
    setResult(null);   // Clear old result

    try {
      const response = await axios.post("http://localhost:5000/api/check-url", { url }, {
        headers: { "Content-Type": "application/json" }
      });

      console.log("Backend Response:", response.data); 

      setResult({ ...response.data, url });
    } catch (error) {
      console.error("Error checking URL safety:", error);
      setResult({ safe: false, details: "Error occurred while checking URL." });
    }

    setLoading(false);  // Hide loading message after scan is complete
  };

  return (
    <div className="App">
      <h1>QR Code Safety Checker</h1>

      {scanning ? (
        <>
          <div ref={readerRef} id="reader"></div>
          <button onClick={() => setScanning(false)}>Stop Scanner</button>
        </>
      ) : (
        <button onClick={startScanner}>Start QR Code Scanner</button>
      )}

      {loading && (
        <div className="loading">
          <p>Scanning in progress...</p>
        </div>
      )}

      {!loading && result && (
        <div className={`result ${result.safe === true ? "safe" : "danger"}`}>
          <h2>Scan Result:</h2>

          {result.safe ? (
            <>
              <p>Safe Link</p>
              <p>This link appears to be safe.</p>
              <a href={result.url} target="_blank" rel="noopener noreferrer">
                Open Scanned Link
              </a>
            </>
          ) : (
            <>
              <p>⚠️ Potentially Dangerous!</p>
              <p>This link might be harmful. Proceed with caution.</p>

              {result.details && result.details.matches && result.details.matches.length > 0 ? (
                result.details.matches.map((match, index) => (
                  <div key={index} className="threat-box">
                    <p><strong>Threat Type:</strong> {match.threatType.replace(/_/g, " ")}</p>
                    <p><strong>URL:</strong> {match.threat.url}</p>
                  </div>
                ))
              ) : (
                <p>No additional threat details available.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
