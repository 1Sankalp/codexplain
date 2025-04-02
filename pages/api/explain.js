import axios from 'axios';
import fs from 'fs';
import path from 'path';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
console.log('API Key length:', ELEVENLABS_API_KEY?.length || 0);
console.log('API Key first 4 chars:', ELEVENLABS_API_KEY?.substring(0, 4) || 'none');
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
  try {
    // Delete existing audio file before generating a new one
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    
    console.log('Making API request to ElevenLabs...');
    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      data: {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      responseType: 'arraybuffer'
    });

    if (!response.data) {
      throw new Error('No response received from ElevenLabs');
    }

    // Write the audio buffer to file
    fs.writeFileSync(outputPath, response.data);
    return outputPath;
    
  } catch (error) {
    console.error('ElevenLabs API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });
    throw new Error('Failed to generate speech');
  }
}