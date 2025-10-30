import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const agentPort = Number(process.env.AGENT_PORT || 4111);
  const url = `http://localhost:${agentPort}/events`;
  try {
    const upstream = await fetch(url, { headers: { Accept: 'text/event-stream' } });
    if (!upstream.body) {
      res.status(502).end();
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = (upstream.body as any).getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    async function pump() {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      res.write(decoder.decode(value));
      pump();
    }
    pump();
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'proxy_error' });
  }
}


