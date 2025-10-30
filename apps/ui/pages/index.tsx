import { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('https://example.com');
  const [text, setText] = useState('Paste text to summarize');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function callAgent(action: 'fetch_url' | 'summarize', input: any) {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, input })
      });
      const json = await res.json();
      if (json.ok) setResult(json.result);
      else setResult(`Error: ${json.error}`);
    } catch (e: any) {
      setResult(`Error: ${e?.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1>Agents 102 – Full-Stack Demo</h1>
      <section style={{ marginTop: 24 }}>
        <h3>Fetch URL</h3>
        <input style={{ width: '100%', padding: 8 }} value={url} onChange={(e) => setUrl(e.target.value)} />
        <button style={{ marginTop: 8 }} disabled={loading} onClick={() => callAgent('fetch_url', { url })}>Fetch</button>
      </section>
      <section style={{ marginTop: 24 }}>
        <h3>Summarize</h3>
        <textarea style={{ width: '100%', height: 160, padding: 8 }} value={text} onChange={(e) => setText(e.target.value)} />
        <button style={{ marginTop: 8 }} disabled={loading} onClick={() => callAgent('summarize', { text, max_tokens: 256 })}>Summarize</button>
      </section>
      <section style={{ marginTop: 24 }}>
        <h3>Result</h3>
        <pre style={{ background: '#111', color: '#0f0', padding: 12, whiteSpace: 'pre-wrap' }}>{result}</pre>
      </section>
    </main>
  );
}
