import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing file ID' });
  }

  try {
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }

    const client = await clientPromise;
    const db = client.db();
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

    // Check if file exists
    const files = await bucket.find({ _id: new ObjectId(id) }).toArray();
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];
    
    // Set appropriate headers
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.metadata?.originalName || file.filename}"`);
    
    // Stream file from GridFS to response
    const downloadStream = bucket.openDownloadStream(new ObjectId(id));
    
    downloadStream.on('error', (err) => {
      console.error('File download error:', err);
      // Only send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.status(500).json({ error: `Failed to download file: ${err.message}` });
      }
    });
    
    // Handle case where no data is available
    downloadStream.on('info', (info) => {
      if (info.numChunks === 0) {
        console.warn('File has no chunks:', id);
        if (!res.headersSent) {
          res.status(404).json({ error: 'File is empty or corrupted' });
        }
      }
    });
    
    downloadStream.pipe(res);
  } catch (err) {
    console.error('File retrieval error:', err);
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to retrieve file' });
    }
  }
}