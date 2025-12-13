import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { provider, text, voiceId, apiKey, userId } = await request.json();

    console.log('Testing voice:', { provider, text, voiceId });

    if (provider === 'openai') {
      console.log('OpenAI voice test requested');
      
      // Use provided API key or fallback to server env var
      const finalApiKey = apiKey || process.env.OPENAI_API_KEY;

      // Validate OpenAI API key
      if (!finalApiKey || finalApiKey.length < 10) {
        return NextResponse.json({ 
          success: false, 
          error: 'Valid OpenAI API key is required',
          provider: 'openai',
          voiceId,
          text 
        }, { status: 400 });
      }

      try {
        // Call OpenAI TTS API
        const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${finalApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: voiceId,
            response_format: 'mp3'
          })
        });

        if (openaiResponse.ok) {
          const audioBuffer = await openaiResponse.arrayBuffer();
          
          // Return the audio as a blob
          return new NextResponse(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.byteLength.toString()
            }
          });
        } else {
          const errorData = await openaiResponse.json();
          console.error('OpenAI TTS API error:', errorData);
          return NextResponse.json({ 
            success: false, 
            error: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}`,
            provider: 'openai',
            voiceId,
            text 
          }, { status: 400 });
        }
      } catch (openaiError) {
        console.error('OpenAI API call failed:', openaiError);
        return NextResponse.json({ 
          success: false, 
          error: 'OpenAI API call failed',
          provider: 'openai',
          voiceId,
          text 
        }, { status: 500 });
      }
    }
    
    if (provider === 'elevenlabs') {
      console.log('Eleven Labs voice test requested');
      
      // Use provided API key or fallback to server env var
      const finalApiKey = apiKey || process.env.ELEVENLABS_API_KEY;
      
      // Validate ElevenLabs API key
      if (!finalApiKey || finalApiKey.length < 10) {
        return NextResponse.json({ 
          success: false, 
          error: 'Valid ElevenLabs API key is required',
          provider: 'elevenlabs',
          voiceId,
          text 
        }, { status: 400 });
      }

      try {
        // Call ElevenLabs TTS API
        const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': finalApiKey
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5', // Use latest low-latency model
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        });

        if (elevenLabsResponse.ok) {
          const audioBuffer = await elevenLabsResponse.arrayBuffer();
          
          // Return the audio as a blob
          return new NextResponse(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.byteLength.toString()
            }
          });
        } else {
          const errorData = await elevenLabsResponse.json();
          console.error('ElevenLabs TTS API error:', errorData);
          return NextResponse.json({ 
            success: false, 
            error: `ElevenLabs API error: ${errorData.detail?.message || 'Unknown error'}`,
            provider: 'elevenlabs',
            voiceId,
            text 
          }, { status: 400 });
        }
      } catch (elevenLabsError) {
        console.error('ElevenLabs API call failed:', elevenLabsError);
        return NextResponse.json({ 
          success: false, 
          error: 'ElevenLabs API call failed',
          provider: 'elevenlabs',
          voiceId,
          text 
        }, { status: 500 });
      }
    }
    
    if (provider === 'google') {
      console.log('Google Cloud voice test requested');
      
      // Use provided API key or fallback to server env var
      const finalApiKey = apiKey || process.env.GOOGLE_API_KEY || process.env.GOOGLE_CLOUD_API_KEY;

      // Validate Google API key
      if (!finalApiKey || finalApiKey === 'AIzaSyBH8vQoQ9X1234567890abcdefghijklmnop' || finalApiKey.length < 10) {
        return NextResponse.json({ 
          success: false, 
          error: 'Valid Google Cloud API key is required',
          provider: 'google',
          voiceId,
          text 
        }, { status: 400 });
      }

      try {
        // Call Google Cloud TTS API
        const googleResponse = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${finalApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: 'en-US',
              name: voiceId
            },
            audioConfig: {
              audioEncoding: 'MP3'
            }
          })
        });

        if (googleResponse.ok) {
          const result = await googleResponse.json();
          
          // Convert base64 audio to blob
          const audioData = atob(result.audioContent);
          const audioArray = new Uint8Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            audioArray[i] = audioData.charCodeAt(i);
          }
          
          return new NextResponse(audioArray.buffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioArray.length.toString()
            }
          });
        } else {
          const errorData = await googleResponse.json();
          console.error('Google Cloud TTS API error:', errorData);
          return NextResponse.json({ 
            success: false, 
            error: `Google Cloud API error: ${errorData.error?.message || 'Unknown error'}`,
            provider: 'google',
            voiceId,
            text 
          }, { status: 400 });
        }
      } catch (googleError) {
        console.error('Google Cloud API call failed:', googleError);
        return NextResponse.json({ 
          success: false, 
          error: 'Google Cloud API call failed',
          provider: 'google',
          voiceId,
          text 
        }, { status: 500 });
      }
    }
    
    if (provider === 'playht') {
      console.log('Play.ht voice test requested');
      const finalApiKey = apiKey || process.env.PLAYHT_API_KEY;
      const finalUserId = userId || process.env.PLAYHT_USER_ID;

      console.log('PlayHT params:', { apiKey: finalApiKey ? 'present' : 'missing', userId: finalUserId, voiceId, text });
      
      // Validate PlayHT API key
      if (!finalApiKey || finalApiKey === 'placeholder_playht_key' || finalApiKey.length < 10) {
        return NextResponse.json({ 
          success: false, 
          error: 'Valid PlayHT API key is required',
          provider: 'playht',
          voiceId,
          text 
        }, { status: 400 });
      }

      try {
        // Call Play.ht TTS API v2 with proper authentication
        const requestBody = {
          text,
          voice: voiceId,
          voice_engine: 'PlayHT2.0',
          quality: 'medium',
          output_format: 'mp3',
          speed: 1.0,
          sample_rate: 24000
        };
        
        console.log('PlayHT request body:', requestBody);
        console.log('PlayHT headers:', {
          'X-USER-ID': finalUserId || '',
          'AUTHORIZATION': `Bearer ${finalApiKey.substring(0, 10)}...`
        });
        console.log('PlayHT API endpoint:', 'https://api.play.ht/api/v2/tts/stream');
        
        const playhtResponse = await fetch('https://api.play.ht/api/v2/tts/stream', {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'X-USER-ID': finalUserId || '',
            'AUTHORIZATION': `Bearer ${finalApiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        if (playhtResponse.ok) {
          const audioBuffer = await playhtResponse.arrayBuffer();
          
          return new NextResponse(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.byteLength.toString()
            }
          });
        } else {
          let errorData;
          try {
            errorData = await playhtResponse.json();
          } catch (e) {
            errorData = { message: 'Failed to parse error response' };
          }
          
          console.error('Play.ht TTS API error:', errorData);
          console.error('Play.ht response status:', playhtResponse.status);
          console.error('Play.ht response headers:', Object.fromEntries(playhtResponse.headers.entries()));
          
          return NextResponse.json({ 
            success: false, 
            error: `Play.ht API error: ${errorData.error?.message || errorData.message || 'Unknown error'}`,
            provider: 'playht',
            voiceId,
            text 
          }, { status: 400 });
        }
      } catch (playhtError) {
        console.error('Play.ht API call failed:', playhtError);
        return NextResponse.json({ 
          success: false, 
          error: 'Play.ht API call failed',
          provider: 'playht',
          voiceId,
          text 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Unknown provider' 
    }, { status: 400 });

  } catch (error) {
    console.error('Voice test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
