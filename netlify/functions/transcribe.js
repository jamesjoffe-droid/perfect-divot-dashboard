const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  try {
    const { videoUrl } = JSON.parse(event.body);
    
    if (!videoUrl) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'videoUrl required' }) };
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'OpenAI API key not configured' }) };
    }

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to download video');
    }
    
    const videoBuffer = await videoResponse.buffer();

    const formData = new FormData();
    formData.append('file', videoBuffer, {
      filename: 'video.mp4',
      contentType: 'video/mp4'
    });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!whisperResponse.ok) {
      throw new Error('Whisper API error');
    }

    const result = await whisperResponse.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ transcript: result.text })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
