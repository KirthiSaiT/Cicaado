// src/pages/api/upload.ts

import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";
import { createClient } from '@supabase/supabase-js';

import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = 'https://whgjhwtcxkxhzkxrndlz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ2pod3RjeGt4aHpreHJuZGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNTMxNTksImV4cCI6MjA2NzgyOTE1OX0.6iMNENGsz08DGs2MNrbubjyTalrDM8jgiBPeJ7VVYd4';
const supabase = createClient(supabaseUrl, supabaseKey);
const bucket = 'files';

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
      const fileBuffer = fs.readFileSync(uploadedFile.filepath);
      const originalName = uploadedFile.originalFilename || `upload`;
      const uniqueId = uuidv4();
      const fileName = `${uniqueId}-${originalName}`;
      console.log('Uploading as:', fileName);
      // Upload to Supabase Storage
      const { error } = await supabase.storage.from(bucket).upload(fileName, fileBuffer, {
        contentType: uploadedFile.mimetype || 'application/octet-stream',
      });
      if (error) {
        console.error('Supabase upload error:', error);
        return res.status(500).json({ error: `Supabase upload error: ${JSON.stringify(error)}` });
      }
      // Get public URL
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return res.status(200).json({ url: publicUrlData.publicUrl, key: fileName });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: "Failed to upload file." });
    }
  } else if (req.method === "DELETE") {
    const { key } = req.query;
    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "Missing or invalid file key." });
    }
    try {
      const { error } = await supabase.storage.from(bucket).remove([key]);
      if (error) {
        console.error('Supabase delete error:', error);
        return res.status(500).json({ error: 'Failed to delete file from Supabase.' });
      }
      return res.status(200).json({ message: "File deleted successfully from Supabase." });
    } catch (err) {
      console.error("Delete error:", err);
      return res.status(500).json({ error: "Failed to delete file from Supabase." });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
