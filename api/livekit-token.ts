import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadAppConfig } from '../src/lib/bevone/config';
import { generateLiveKitToken } from '../src/server/livekit-token';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(204).end();
  }

  try {
    const config = loadAppConfig();
    const token = await generateLiveKitToken(config.id);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(token);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Token generation failed',
    });
  }
}
