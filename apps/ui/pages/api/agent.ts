import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const agentPort = Number(process.env.AGENT_PORT || 4111);
  const url = `http://localhost:${agentPort}/agent/act`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const data = await upstream.text();
    res.status(upstream.status).send(data);
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'proxy_error' });
  }
}
