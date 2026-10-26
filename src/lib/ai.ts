import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = "claude-opus-5-5";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function claudeModel() {
  const model = process.env.CLAUDE_MODEL?.trim();
  return model && /^[a-z0-9.\-_]{3,80}$/i.test(model) ? model : DEFAULT_MODEL;
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 1 });
  return client;
}

export async function claudeText(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens: number;
}): Promise<string> {
  const res = await getClient().messages.create({
    model: claudeModel(),
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: opts.messages,
  });
  return res.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
}
