import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const agentPort = Number(process.env.AGENT_PORT || 4111);
  const url = `http://localhost:${agentPort}/events`;

  try {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Create a readable stream from the agent's SSE endpoint
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok || !response.body) {
      res.status(502).json({ error: 'Failed to connect to agent events' });
      return;
    }

    // Stream the response body directly
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            res.end();
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (error: any) {
        console.error('SSE stream error:', error);
        if (!res.writableEnded) {
          res.end();
        }
      }
    };

    // Start pumping
    pump();

    // Handle client disconnect
    req.on('close', () => {
      reader.cancel();
      if (!res.writableEnded) {
        res.end();
      }
    });
  } catch (error: any) {
    console.error('SSE proxy error:', error);
    if (!res.writableEnded) {
      res.status(500).json({ error: error?.message || 'SSE proxy failed' });
    }
  }
}