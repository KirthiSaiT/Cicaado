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
    
    // Read file data directly into memory with better error handling
    console.log(`Reading file from MongoDB GridFS: ${fileName}`);
    
    // Stream file from GridFS to buffer
    const chunks: Buffer[] = [];
    const downloadStream = bucket.openDownloadStream(new ObjectId(key));
    
    // Collect all data chunks
    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    // Wait for the download to complete
    const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
      downloadStream.on('error', (error) => {
        console.error(`Error downloading file from GridFS: ${error}`);
        reject(new Error(`Failed to download file from MongoDB: ${error.message}`));
      });
      
      downloadStream.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        console.log(`File successfully read from MongoDB. Size: ${fullBuffer.length} bytes`);
        resolve(fullBuffer);
      });
    });
    
    // Verify we have file data
    if (fileBuffer.length === 0) {
      return res.status(500).json({ error: 'Downloaded file is empty.' });
    }
    
    console.log(`File read successfully from MongoDB. Size: ${fileBuffer.length} bytes`);
    
    // Additional validation: check if the file size matches what's stored in metadata
    const expectedSize = file.metadata?.size;
    if (expectedSize && fileBuffer.length !== expectedSize) {
      console.warn(`File size mismatch. Expected: ${expectedSize}, Actual: ${fileBuffer.length}`);
    }

    // Convert file buffer to base64 for transmission
    const fileDataBase64 = fileBuffer.toString('base64');
    
    // Validate base64 encoding
    try {
      const decodedBuffer = Buffer.from(fileDataBase64, 'base64');
      if (decodedBuffer.length !== fileBuffer.length) {
        console.warn(`Base64 encoding validation failed. Original: ${fileBuffer.length}, Decoded: ${decodedBuffer.length}`);
      }
    } catch (decodeError) {
      console.error('Base64 encoding validation error:', decodeError);
      return res.status(500).json({ error: 'Failed to validate file encoding.' });
    }
    
    // Send the file data, original filename, and content type to the processor
    const response = await fetch(`${processorUrl}/process`, {
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