import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ElevenLabsClient } from "elevenlabs";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // Replace with your preferred voice ID

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { code } = req.body;

  try {
    // Step 1: Preprocess the code (remove comments and unnecessary symbols)
    const cleanedCode = removeCommentsAndSymbols(code);

    // Step 2: Use Groq's LLaMA to generate an explanation
    const explanation = await getCodeExplanation(cleanedCode);

    // Step 3: Convert the explanation to speech using ElevenLabs
    const timestamp = Date.now();
    const audioFilePath = path.join('/tmp', `explanation_${timestamp}.mp3`);
    await generateSpeechWithElevenLabs(explanation, audioFilePath);

    // Step 4: Return the URL of the audio file
    const audioUrl = `${req.headers.origin}/api/audio?file=explanation_${timestamp}.mp3`;
    res.status(200).json({ audioUrl });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Function to remove comments and unnecessary symbols
function removeCommentsAndSymbols(code) {
  code = code.replace(/\/\/.*$/gm, ''); // Remove single-line comments
  code = code.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
  return code.trim();
}

async function getCodeExplanation(code) {
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a helpful code explainer. First, detect the programming language of the following code. Then, explain it in simple terms while maintaining technical accuracy, ignoring comments and unnecessary symbols:' },
          { role: 'user', content: `Code:\n\n${code}\n\nWhat language is this? Explain it step by step.` },
        ],
        max_tokens: 300,
        temperature: 0.7, 
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw new Error('Failed to generate explanation');
  }
}

async function generateSpeechWithElevenLabs(text, outputPath) {
  const client = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });

  try {
    // Delete existing audio file before generating a new one
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    
    const response = await client.textToSpeech.convert(VOICE_ID, {
      text,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
    });

    // Convert the response (stream) to a Buffer
    const chunks = [];
    for await (const chunk of response) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Write to file
    fs.writeFileSync(outputPath, audioBuffer);
    return outputPath;
    
  } catch (error) {
    console.error('ElevenLabs API Error:', error.message);
    throw new Error('Failed to generate speech');
  }
}