import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new Server({ name: "mcp-server", version: "0.1.0" });

// Resource: in-memory notes
const notes: Array<{ id: string; content: string }> = [];

// Tool: add_note
const addNoteSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
});
server.tool("add_note", "Add or replace a note by id", async (args) => {
  const parsed = addNoteSchema.parse(args);
  const idx = notes.findIndex((n) => n.id === parsed.id);
  if (idx >= 0) notes[idx] = parsed;
  else notes.push(parsed);
  return { ok: true };
});

// Tool: summarize_note
const summarizeSchema = z.object({ id: z.string().min(1) });
server.tool("summarize_note", "Summarize a note content", async (args) => {
  const { id } = summarizeSchema.parse(args);
  const n = notes.find((x) => x.id === id);
  if (!n) throw new Error("note_not_found");
  const content = n.content;
  const summary =
    content.length > 280 ? content.slice(0, 277) + "..." : content;
  return { summary };
});

server.resource.list(async () => {
  return notes.map((n) => ({
    uri: `note://${n.id}`,
    name: n.id,
    mimeType: "text/plain",
  }));
});

server.resource.read(async (uri) => {
  const id = uri.replace("note://", "");
  const n = notes.find((x) => x.id === id);
  if (!n) throw new Error("note_not_found");
  return { mimeType: "text/plain", data: n.content };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
