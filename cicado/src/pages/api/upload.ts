// src/pages/api/upload.ts

import type { NextApiRequest, NextApiResponse } from "next";
import AWS from "aws-sdk";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";
import fetch from "node-fetch"; // ✅ Required in Node.js environment

// Disable Next.js default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// AWS Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

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

      const fileStream = fs.createReadStream(uploadedFile.filepath);
      const key = uploadedFile.originalFilename || `upload-${Date.now()}`;

      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        Body: fileStream,
        ContentType: uploadedFile.mimetype || "application/octet-stream",
      };

      const uploadResult = await s3.upload(uploadParams).promise();

      // Call external processor
      const processorUrl =
        process.env.NEXT_PUBLIC_PROCESSOR_URL || "http://processor:5000";

      const processorResponse = await fetch(`${processorUrl}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      const processorData = (await processorResponse.json()) as { error?: string };

      if (!processorResponse.ok) {
        console.error("Processor error:", processorData.error);
        return res
          .status(500)
          .json({ error: processorData.error || "Processing failed" });
      }

      return res.status(200).json({
        url: uploadResult.Location,
        key,
        processorData,
      });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: "Failed to upload file to S3." });
    }
  }

  // DELETE method - delete file from S3
  else if (req.method === "DELETE") {
    const { key } = req.query;

    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "Missing or invalid file key." });
    }

    try {
      await s3
        .deleteObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: key,
        })
        .promise();

      return res.status(200).json({ message: "File deleted successfully." });
    } catch (err) {
      console.error("Delete error:", err);
      return res
        .status(500)
        .json({ error: "Failed to delete file from S3." });
    }
  }

  // Method Not Allowed
  else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
