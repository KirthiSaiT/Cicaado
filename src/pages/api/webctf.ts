import type { NextApiRequest, NextApiResponse } from "next";

const PROCESSOR_URL = process.env.NEXT_PUBLIC_PROCESSOR_URL || "http://localhost:5000";

// Longer timeouts for scanning tools that make many concurrent requests
const TOOL_TIMEOUTS: Record<string, number> = {
  leaks:   90_000,
  dirbust: 90_000,
  wayback: 30_000,
  headers: 20_000,
  cookies: 20_000,
  jwt:     10_000,
};

export const config = {
  api: { responseLimit: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tool, ...params } = req.body as { tool: string; [key: string]: unknown };
  if (!tool) {
    return res.status(400).json({ error: "Tool name is required" });
  }

  const timeoutMs = TOOL_TIMEOUTS[tool] ?? 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstream = await fetch(`${PROCESSOR_URL}/api/webctf/${tool}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err: unknown) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "Request failed";
    const isTimeout = message.includes("abort") || message.includes("timeout");
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? `Tool timed out after ${timeoutMs / 1000}s` : message,
    });
  }
}
