import { useState, useEffect } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css"; // Light theme for syntax highlighting

export default function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("Detecting...");
  const [audioUrl, setAudioUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (code.trim()) {
      const detectedLang = hljs.highlightAuto(code).language || "Unknown";
      setLanguage(detectedLang);
    } else {
      setLanguage("Detecting...");
    }
  }, [code]);

  const handleExplainCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      setAudioUrl(data.audioUrl);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Code Explainer 🚀</h1>
      <p className="text-gray-600 mb-6 text-lg">Paste your code, and get an audio explanation of what it does.</p>

      <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-lg">
        <p className="text-sm text-gray-500 mb-2">Detected Language: <span className="font-medium text-gray-900">{language}</span></p>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          rows={8}
          className="w-full p-3 border border-gray-300 rounded-lg text-gray-800 focus:ring focus:ring-blue-200"
        />
        <button
          onClick={handleExplainCode}
          disabled={isLoading}
          className="w-full mt-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition font-medium"
        >
          {isLoading ? "Explaining..." : "Explain Code"}
        </button>
      </div>

      {audioUrl && (
        <div className="mt-6 w-full max-w-2xl bg-white p-4 rounded-lg shadow">
          <audio controls className="w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}
