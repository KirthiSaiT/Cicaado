import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { module_name, domain, deep } = req.body;

  if (!module_name || !domain) {
    return res.status(400).json({ error: 'Module name and domain are required' });
  }

  const processorUrl = process.env.NEXT_PUBLIC_PROCESSOR_URL || 'http://localhost:5000';

  try {
    const response = await fetch(`${processorUrl}/api/recon/${module_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain, deep }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Failed to fetch from processor' });
    }

    return res.status(200).json(data);
  } catch (error: unknown) {
    console.error('Error proxying recon request:', error);
    const errObj = error as Error;
    return res.status(500).json({
      error: `Recon failed: ${errObj.message || 'Unknown error'}`,
    });
  }
}
