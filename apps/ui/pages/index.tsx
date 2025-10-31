import { useEffect, useState } from "react";

interface Event {
  type: string;
  action?: string;
  at: number;
  error?: string;
  preview?: string;
  length?: number;
}

export default function Home() {
  const [url, setUrl] = useState("https://example.com");
  const [text, setText] = useState("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      es = new EventSource("/api/events");

      es.onopen = () => {
        setConnected(true);
        console.log("SSE connected");
      };

      es.onmessage = (ev) => {
        try {
          const data: Event = JSON.parse(ev.data);
          setEvents((prev) => [data, ...prev].slice(0, 100));
        } catch (e) {
          console.error("Failed to parse event:", ev.data);
        }
      };

      es.onerror = () => {
        setConnected(false);
        es?.close();
        // Reconnect after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      es?.close();
    };
  }, []);

  const [fetchedContent, setFetchedContent] = useState<string>("");

  async function callAgent(action: "fetch_url" | "summarize", input: any) {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, input }),
      });
      const json = await res.json();
      if (json.ok) {
        setResult(json.result);
        // If fetching URL, save content for potential summarization
        if (action === "fetch_url") {
          setFetchedContent(json.result);
        }
      } else {
        setResult(`❌ Error: ${json.error}`);
      }
    } catch (e: any) {
      setResult(
        `❌ Network Error: ${e?.message || "Failed to connect to agent"}`
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchAndSummarize() {
    if (!url) return;
    setLoading(true);
    setResult("");
    try {
      // Step 1: Fetch URL
      const fetchRes = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetch_url", input: { url } }),
      });
      const fetchJson = await fetchRes.json();
      
      if (!fetchJson.ok) {
        setResult(`❌ Fetch Error: ${fetchJson.error}`);
        setLoading(false);
        return;
      }

      const htmlContent = fetchJson.result;
      setResult(`📄 Fetched ${htmlContent.length} characters\n\n`);
      setFetchedContent(htmlContent);

      // Step 2: Summarize the fetched content
      // Extract text from HTML (simple strip tags)
      const textContent = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000); // Limit to first 5000 chars for summarization

      const summarizeRes = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "summarize",
          input: { text: textContent, max_tokens: 300 },
        }),
      });
      const summarizeJson = await summarizeRes.json();

      if (summarizeJson.ok) {
        setResult(
          `📄 Fetched ${htmlContent.length} characters\n\n✨ Summary:\n${summarizeJson.result}`
        );
        setText(textContent); // Auto-fill summarize textarea
      } else {
        setResult(
          `📄 Fetched ${htmlContent.length} characters\n\n❌ Summarize Error: ${summarizeJson.error}`
        );
      }
    } catch (e: any) {
      setResult(
        `❌ Network Error: ${e?.message || "Failed to process request"}`
      );
    } finally {
      setLoading(false);
    }
  }

  function useFetchedContent() {
    if (fetchedContent) {
      // Extract text from HTML for summarize
      const textContent = fetchedContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      setText(textContent);
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "hello":
        return "👋";
      case "heartbeat":
        return "💓";
      case "action_start":
        return "▶️";
      case "action_result":
        return "✅";
      case "action_error":
        return "❌";
      default:
        return "📝";
    }
  };

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "24px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        background: "#f8f9fa",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          padding: "32px",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            margin: "0 0 8px 0",
            fontSize: "28px",
            fontWeight: 700,
            color: "#1a1a1a",
          }}
        >
          Agents 102 – Full-Stack Demo
        </h1>
        <p style={{ margin: "0 0 24px 0", color: "#666", fontSize: "14px" }}>
          Interactive AI agent with real-time event streaming. Test URL fetching
          and text summarization.
        </p>

        {/* Status Indicator */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            background: connected ? "#d4edda" : "#f8d7da",
            color: connected ? "#155724" : "#721c24",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 500,
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: connected ? "#28a745" : "#dc3545",
            }}
          />
          {connected ? "Live Events Connected" : "Live Events Disconnected"}
        </div>
      </div>

      <div
        style={{ display: "grid", gap: "24px", gridTemplateColumns: "1fr 1fr" }}
      >
        {/* Fetch URL Section */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            padding: "24px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "20px",
                fontWeight: 600,
                color: "#1a1a1a",
              }}
            >
              🌐 Fetch URL
            </h2>
            <p
              style={{
                margin: 0,
                color: "#666",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              Retrieve and display the raw HTML/text content from any publicly
              accessible URL. You can then summarize the fetched content.
            </p>
          </div>
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
              marginBottom: "12px",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => callAgent("fetch_url", { url })}
              disabled={loading || !url}
              style={{
                flex: 1,
                padding: "12px",
                background: loading ? "#ccc" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: loading || !url ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {loading ? "⏳ Processing..." : "🔍 Fetch Only"}
            </button>
            <button
              onClick={fetchAndSummarize}
              disabled={loading || !url}
              style={{
                flex: 1,
                padding: "12px",
                background: loading ? "#ccc" : "#6f42c1",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: loading || !url ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {loading ? "⏳ Processing..." : "🚀 Fetch & Summarize"}
            </button>
          </div>
        </div>

        {/* Summarize Section */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            padding: "24px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "20px",
                fontWeight: 600,
                color: "#1a1a1a",
              }}
            >
              📝 Summarize
            </h2>
            <p
              style={{
                margin: 0,
                color: "#666",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              Use AI to generate a concise summary of any text using the Nosana
              LLM endpoint. Works standalone or with fetched URL content.
            </p>
          </div>
          {fetchedContent && (
            <button
              onClick={useFetchedContent}
              disabled={loading}
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: "12px",
                background: "#e7f3ff",
                color: "#0066cc",
                border: "1px solid #b3d9ff",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              📋 Use fetched content from URL above
            </button>
          )}
          <textarea
            placeholder="Paste or type text to summarize here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              minHeight: "120px",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
              marginBottom: "12px",
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => callAgent("summarize", { text, max_tokens: 256 })}
            disabled={loading || !text.trim()}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: loading || !text.trim() ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {loading ? "⏳ Processing..." : "✨ Summarize Text"}
          </button>
        </div>
      </div>

      {/* Result Section */}
      {result && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            padding: "24px",
            marginTop: "24px",
          }}
        >
          <h2
            style={{
              margin: "0 0 16px 0",
              fontSize: "20px",
              fontWeight: 600,
              color: "#1a1a1a",
            }}
          >
            📊 Result
          </h2>
          <div
            style={{
              background: "#1e1e1e",
              color: "#d4d4d4",
              padding: "16px",
              borderRadius: "8px",
              maxHeight: "400px",
              overflow: "auto",
              fontSize: "13px",
              fontFamily: "ui-monospace, 'Courier New', monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.6,
            }}
          >
            {result || (
              <span style={{ color: "#888" }}>
                No result yet. Try fetching a URL or summarizing text.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Live Events Section */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          padding: "24px",
          marginTop: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 600,
              color: "#1a1a1a",
            }}
          >
            🔴 Live Events Stream
          </h2>
          <button
            onClick={() => setEvents([])}
            style={{
              padding: "6px 12px",
              background: "#f8f9fa",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
        <div
          style={{
            background: "#f8f9fa",
            border: "1px solid #e9ecef",
            borderRadius: "8px",
            padding: "16px",
            maxHeight: "300px",
            overflow: "auto",
            minHeight: "100px",
          }}
        >
          {events.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#999",
                padding: "24px",
                fontSize: "13px",
              }}
            >
              {connected
                ? "Waiting for events..."
                : "Connecting to event stream..."}
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {events.map((event, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 12px",
                    background: "white",
                    borderRadius: "6px",
                    border: "1px solid #e9ecef",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>
                    {getEventIcon(event.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 500,
                        color: "#1a1a1a",
                        marginBottom: "4px",
                      }}
                    >
                      {event.type}
                      {event.action && (
                        <span style={{ color: "#666", marginLeft: "4px" }}>
                          ({event.action})
                        </span>
                      )}
                    </div>
                    {event.error && (
                      <div style={{ color: "#dc3545", fontSize: "11px" }}>
                        Error: {event.error}
                      </div>
                    )}
                    {event.preview && (
                      <div
                        style={{
                          color: "#666",
                          fontSize: "11px",
                          marginTop: "4px",
                        }}
                      >
                        Preview: {event.preview}...
                      </div>
                    )}
                    {event.length && (
                      <div
                        style={{
                          color: "#666",
                          fontSize: "11px",
                          marginTop: "4px",
                        }}
                      >
                        Length: {event.length.toLocaleString()} chars
                      </div>
                    )}
                    <div
                      style={{
                        color: "#999",
                        fontSize: "10px",
                        marginTop: "4px",
                      }}
                    >
                      {new Date(event.at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
