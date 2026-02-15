import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';

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
    // Validate ObjectId format first
    if (!ObjectId.isValid(key)) {
      return res.status(400).json({ error: 'Invalid file key format.' });
    }

    // Connect to MongoDB to retrieve the file
    const client = await clientPromise;
    const db = client.db();
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

    // Check if file exists
    const files = await bucket.find({ _id: new ObjectId(key) }).toArray();

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found in MongoDB' });
    }

    const file = files[0];
    // Use the original filename from metadata to preserve file extension
    const fileName = file.metadata?.originalName || file.filename;
    const contentType = file.contentType || 'application/octet-stream';

    // Verify we have file data (Wait! We don't need to read it anymore!)
    // OPTIMIZATION: Instead of reading the file into memory (which crashes the server),
    // We just tell the Processor the ID, and let it fetch directly from MongoDB.

    console.log(`Delegating file fetch to Processor for ID: ${key}`);
    const fileDataBase64 = ""; // Empty, to save memory
    // fileName and contentType are already defined above

    // We skip the downloadStream logic completely!

    // Increase timeout to 10 minutes (600000 ms) for long-running tools like stegseek
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000);

    let response;
    try {
      response = await fetch(`${processorUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: fileDataBase64,
          fileName: fileName,
          contentType: contentType,
          originalFileId: key
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Log the processor URL (masked) for debugging
    console.log(`Connecting to Processor at: ${processorUrl}, for file: ${fileName}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from processor (${response.status}):`, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return res.status(response.status).json({ error: errorJson.error || 'Failed to process file.' });
      } catch {
        return res.status(response.status).json({ error: `Backend Error (${response.status}): ${errorText.substring(0, 200)}` });
      }
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: unknown) {
    console.error('Error processing analysis request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return res.status(500).json({
      error: `Analysis failed: ${errorMessage}`,
      details: errorStack
    });
  }
}