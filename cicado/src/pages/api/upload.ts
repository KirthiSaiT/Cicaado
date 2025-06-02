// src/pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import AWS from "aws-sdk";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";

// Prevent Next.js default body parsing
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

// Promisify form parsing
const parseForm = async (req: NextApiRequest): Promise<{ files: formidable.Files }> => {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ files });
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { files } = await parseForm(req);

    // Handle both array and single file cases
    let file: FormidableFile | undefined;
    if (Array.isArray(files.file)) {
      file = files.file[0];
    } else {
      file = files.file as FormidableFile;
    }

    if (!file || !file.filepath) {
      console.error("File object received from formidable:", file);
      return res.status(400).json({ error: "No file uploaded or file is invalid." });
    }

    const fileStream = fs.createReadStream(file.filepath);

    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: file.originalFilename || `upload-${Date.now()}`,
      Body: fileStream,
      ContentType: file.mimetype || "application/octet-stream",
    };

    const data = await s3.upload(uploadParams).promise();

    return res.status(200).json({ url: data.Location });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Failed to upload file to S3." });
  }
}
