import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadAppConfig } from '../src/lib/bevone/config';
import { executeTool } from '../src/lib/bevone/sql-executor';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const config = loadAppConfig();

    // Extract path after /api/pos/
    const pathname = (req.url || '').replace(/^\/api\/pos\/?/, '');
    const segments = pathname.split('/').filter(Boolean);
    const method = req.method!;

    // Map REST routes to tool names
    const routeMap: Record<string, string> = {
      'GET:/tabs': 'pos_get_tabs',
      'POST:/tabs': 'pos_open_tab',
      'GET:/tabs/:id': 'pos_get_tab_detail',
      'POST:/tabs/:id/items': 'pos_add_items',
      'PATCH:/tabs/:id/items/:itemId': 'pos_void_item',
      'POST:/tabs/:id/pay': 'pos_close_tab',
      'GET:/menu': 'pos_get_menu',
      'GET:/menu/categories': 'pos_get_categories',
      'POST:/menu/items/:id/86': 'pos_86_item',
      'GET:/reports': 'pos_get_sales',
    };

    let toolName: string | null = null;
    let params: Record<string, any> = {};

    for (const [route, tool] of Object.entries(routeMap)) {
      const [routeMethod, routePath] = route.split(':');
      if (routeMethod !== method) continue;

      const match = matchRoute(routePath, '/' + segments.join('/'));
      if (match) {
        toolName = tool;
        params = match;
        break;
      }
    }

    if (!toolName) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const tool = config.tools.find(t => t.name === toolName);
    if (!tool) {
      return res.status(404).json({ error: `Tool ${toolName} not configured` });
    }

    if (['POST', 'PATCH'].includes(method) && req.body) {
      params = { ...params, ...req.body };
    }

    const result = await executeTool(tool, params, config.connection);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed',
    });
  }
}

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}
