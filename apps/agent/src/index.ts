import express from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';

const app = express();
app.use(express.json());

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || '';
const MODEL_NAME = process.env.MODEL_NAME_AT_ENDPOINT || 'Qwen2.5:7b';

// Simple in-memory SSE clients list
const sseClients = new Set<import('express').Response>();

function sseSend(data: unknown) {
	const payload = `data: ${JSON.stringify(data)}\n\n`;
	for (const res of sseClients) {
		try {
			res.write(payload);
		} catch {}
	}
}

// Tool 1: fetch_url - fetch arbitrary public URL text
const fetchUrlSchema = z.object({ url: z.string().url() });

async function toolFetchUrl(args: z.infer<typeof fetchUrlSchema>): Promise<string> {
	const res = await fetch(args.url);
	if (!res.ok) throw new Error(`Failed to fetch ${args.url}: ${res.status}`);
	return await res.text();
}

// Tool 2: summarize - summarize text with hosted LLM
const summarizeSchema = z.object({ text: z.string().min(1), max_tokens: z.number().min(64).max(2048).default(256) });

async function toolSummarize(args: z.infer<typeof summarizeSchema>): Promise<string> {
	if (!OLLAMA_API_URL) throw new Error('OLLAMA_API_URL not set');
	const body = {
		model: MODEL_NAME,
		messages: [
			{ role: 'system', content: 'You are a concise summarizer. Return a crisp summary.' },
			{ role: 'user', content: `Summarize the following text:\n\n${args.text}` }
		],
		stream: false,
		max_tokens: args.max_tokens
	};
	const res = await fetch(`${OLLAMA_API_URL}/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const err = await res.text();
		throw new Error(`LLM error: ${res.status} ${err}`);
	}
	const json = await res.json();
	const content = json?.message?.content || json?.choices?.[0]?.message?.content || '';
	return String(content).trim();
}

// Simple agent route that can call tools
app.post('/agent/act', async (req, res) => {
	try {
		const { action, input } = req.body || {};
		sseSend({ type: 'action_start', action, at: Date.now(), input });
		if (action === 'fetch_url') {
			const parsed = fetchUrlSchema.parse(input);
			const out = await toolFetchUrl(parsed);
			sseSend({ type: 'action_result', action, at: Date.now(), length: out.length });
			return res.json({ ok: true, result: out });
		}
		if (action === 'summarize') {
			const parsed = summarizeSchema.parse(input);
			const out = await toolSummarize(parsed);
			sseSend({ type: 'action_result', action, at: Date.now(), preview: String(out).slice(0, 160) });
			return res.json({ ok: true, result: out });
		}
		return res.status(400).json({ ok: false, error: 'Unknown action' });
	} catch (e: any) {
		sseSend({ type: 'action_error', at: Date.now(), error: e?.message || 'Internal error' });
		return res.status(500).json({ ok: false, error: e?.message || 'Internal error' });
	}
});

// SSE endpoint for live synchronization
app.get('/events', (req, res) => {
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.flushHeaders?.();

	// send hello + heartbeat
	res.write(`data: ${JSON.stringify({ type: 'hello', at: Date.now() })}\n\n`);
	const heartbeat = setInterval(() => {
		try { res.write(`data: ${JSON.stringify({ type: 'heartbeat', at: Date.now() })}\n\n`); } catch {}
	}, 15000);

	sseClients.add(res);
	req.on('close', () => {
		clearInterval(heartbeat);
		sseClients.delete(res);
		try { res.end(); } catch {}
	});
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const port = Number(process.env.AGENT_PORT || 4111);
app.listen(port, () => {
	console.log(`[agent] listening on :${port}`);
});
