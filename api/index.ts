import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadAppConfig } from '../src/lib/bevone/config';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const config = loadAppConfig();
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>${config.pos?.venueName || config.name} - BevOne POS</title></head>
<body>
  <h1>${config.pos?.venueName || config.name}</h1>
  <p>BevOne Venue Agent is running.</p>
  <ul>
    <li><a href="/health">Health Check</a></li>
    <li><a href="/api/livekit-token">LiveKit Token</a></li>
    <li><a href="/api/pos/menu">Menu</a></li>
    <li><a href="/api/pos/tabs">Open Tabs</a></li>
  </ul>
</body>
</html>`);
  } catch {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>BevOne POS</title></head>
<body>
  <h1>BevOne Venue Agent</h1>
  <p>Set APP_CONFIG environment variable to configure this venue.</p>
</body>
</html>`);
  }
}
