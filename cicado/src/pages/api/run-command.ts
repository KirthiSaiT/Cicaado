import { NextApiRequest, NextApiResponse } from 'next';

// No formidable needed for JSON body
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Directly access the JSON body
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'Missing file key.' });
  }

  const processorUrl = process.env.NEXT_PUBLIC_PROCESSOR_URL;

  if (!processorUrl) {
    console.error('NEXT_PUBLIC_PROCESSOR_URL is not defined.');
    return res.status(500).json({ error: 'Processor URL is not configured.' });
  }

  try {
    const response = await fetch(`${processorUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from processor:', errorData);
      return res.status(response.status).json({ error: errorData.error || 'Failed to process file.' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error processing analysis request:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
} 