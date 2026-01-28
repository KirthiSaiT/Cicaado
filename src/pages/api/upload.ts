// src/pages/api/upload.ts

import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";
import { v4 as uuidv4 } from 'uuid';
import clientPromise from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Parse incoming form data
const parseForm = async (
  req: NextApiRequest
): Promise<{ files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, keepExtensions: true });
    form.parse(req, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
      if (err) reject(err);
      else resolve({ files });
    });
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const { files } = await parseForm(req);
      const uploadedFile = Array.isArray(files.file)
        ? files.file[0]
        : (files.file as FormidableFile | undefined);
      if (!uploadedFile || !uploadedFile.filepath) {
        console.error("Invalid file received:", uploadedFile);
        return res.status(400).json({ error: "No valid file uploaded." });
      }
      
      // Read file data with better error handling
      let fileBuffer: Buffer;
      try {
        fileBuffer = fs.readFileSync(uploadedFile.filepath);
        // Validate that we actually have data
        if (fileBuffer.length === 0) {
          console.error("File is empty:", uploadedFile.filepath);
          return res.status(400).json({ error: "Uploaded file is empty." });
        }
        console.log(`File read successfully. Size: ${fileBuffer.length} bytes`);
      } catch (readError) {
        console.error("Error reading uploaded file:", readError);
        return res.status(500).json({ error: "Failed to read uploaded file." });
      }
      
      const originalName = uploadedFile.originalFilename || `upload`;
      const uniqueId = uuidv4();
      const fileName = `${uniqueId}-${originalName}`;
      const contentType = uploadedFile.mimetype || 'application/octet-stream';
      
      // Connect to MongoDB
      const client = await clientPromise;
      const db = client.db();
      
      // Create GridFS bucket
      const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
      
      // Upload file to GridFS with proper error handling
      const uploadStream = bucket.openUploadStream(fileName, {
        contentType: contentType,
        metadata: {
          originalName: originalName,
          uploadDate: new Date(),
          size: fileBuffer.length
        }
      });
      
      // Write file buffer to GridFS
      uploadStream.end(fileBuffer);
      
      // Wait for the upload to complete
      await new Promise((resolve, reject) => {
        uploadStream.on('finish', resolve);
        uploadStream.on('error', (error) => {
          console.error('GridFS upload error:', error);
          reject(new Error(`Failed to upload file to MongoDB: ${error.message}`));
        });
      });
      
      // Get the file ID from the upload stream
      const fileId = uploadStream.id;
      
      // Verify the file was uploaded successfully by reading it back
      try {
        const verifyFiles = await bucket.find({ _id: fileId }).toArray();
        if (verifyFiles.length === 0) {
          throw new Error('File upload verification failed: File not found in GridFS after upload');
        }
        
        // Additional verification: try to read the file back
        const chunks: Buffer[] = [];
        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId.toString()));
        
        downloadStream.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        const verifyBuffer = await new Promise<Buffer>((resolve, reject) => {
          downloadStream.on('error', reject);
          downloadStream.on('end', () => {
            const fullBuffer = Buffer.concat(chunks);
            resolve(fullBuffer);
          });
        });
        
        // Compare file sizes
        if (verifyBuffer.length !== fileBuffer.length) {
          console.warn(`File size mismatch during verification. Original: ${fileBuffer.length}, Retrieved: ${verifyBuffer.length}`);
        }
      } catch (verifyError) {
        console.error('File verification error:', verifyError);
        // Don't fail the upload just because of verification issues, but log it
      }
      
      // Return file information
      return res.status(200).json({ 
        url: `/api/file/${fileId}`, 
        key: fileId.toString() 
      });
    } catch (err) {
      console.error("Upload error:", err);
      // Make sure we're sending JSON response
      return res.status(500).json({ error: "Failed to upload file." });
    }
  } else if (req.method === "DELETE") {
    const { key } = req.query;
    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "Missing or invalid file key." });
    }
    try {
      // Connect to MongoDB
      const client = await clientPromise;
      const db = client.db();
      
      // Create GridFS bucket
      const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
      
      // Delete file from GridFS
      await bucket.delete(new ObjectId(key));
      
      return res.status(200).json({ message: "File deleted successfully from MongoDB." });
    } catch (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ error: "Failed to delete file from MongoDB." });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}