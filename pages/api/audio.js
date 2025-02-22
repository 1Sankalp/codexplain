import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { file } = req.query;
  const audioFilePath = path.join('/tmp', file);

  if (!fs.existsSync(audioFilePath)) {
    return res.status(404).json({ message: 'Audio file not found' });
  }

  // Set headers to prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Expires', '0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Surrogate-Control', 'no-store');

  // Send the audio file
  res.setHeader('Content-Type', 'audio/mpeg');
  const fileStream = fs.createReadStream(audioFilePath);
  fileStream.pipe(res);
}
