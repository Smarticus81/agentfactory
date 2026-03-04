import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadAppConfig } from '../src/lib/bevone/config';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const config = loadAppConfig();
    res.status(200).json({ status: 'ok', app: config.name });
  } catch {
    res.status(200).json({ status: 'ok', app: 'bevone-venue-agent' });
  }
}
