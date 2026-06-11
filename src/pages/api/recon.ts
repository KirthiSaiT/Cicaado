import type { NextApiRequest, NextApiResponse } from "next";

const PROCESSOR_URL = process.env.NEXT_PUBLIC_PROCESSOR_URL || "http://localhost:5000";

export const config = {
  api: { responseLimit: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { module_name, domain, deep } = req.body;

  if (!module_name || !domain) {
    return res.status(400).json({ error: "Module name and domain are required" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(`${PROCESSOR_URL}/api/recon/${module_name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, deep }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || "Recon failed" });
    }
    return res.status(200).json(data);
  } catch (err: unknown) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = message.includes("abort") || message.includes("timeout");
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout ? "Recon timed out after 60s" : `Recon failed: ${message}`,
    });
  }
}
