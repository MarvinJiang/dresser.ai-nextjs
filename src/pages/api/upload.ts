// pages/api/upload.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { IncomingForm, File as FormidableFile } from 'formidable';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs';
import path from 'path';
import os from 'os';

// Disable Next.js's default body parser to handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize the S3 Client using AWS SDK v3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Ensures the temporary upload directory exists.
 * @param dir - Directory path to ensure.
 */
const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Parses the incoming form data using formidable.
 * @param req - Next.js API request object
 * @returns A promise that resolves with the parsed fields and files
 */
const parseForm = (req: NextApiRequest) => {
  const uploadDir = path.join(os.tmpdir(), 'nextjs-upload');
  ensureDirectoryExists(uploadDir);

  const form = new IncomingForm({
    multiples: false, // Accept a single file per request
    keepExtensions: true, // Preserve file extensions
    uploadDir: uploadDir, // Temporary upload directory
  });

  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
};

/**
 * API Route Handler for uploading files to AWS S3.
 * @param req - Next.js API request object
 * @param res - Next.js API response object
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Ensure the request method is POST
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    // Parse the incoming form data
    const { fields, files } = await parseForm(req);

    // Retrieve the uploaded file
    const file = files.file as FormidableFile;
    if (!file || !file.filepath) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Optional: Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']; // Add as needed
    if (!allowedTypes.includes(file.mimetype || '')) {
      res.status(400).json({ error: 'Unsupported file type' });
      fs.unlinkSync(file.filepath); // Delete the temporary file
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      res.status(400).json({ error: 'File size exceeds limit' });
      fs.unlinkSync(file.filepath); // Delete the temporary file
      return;
    }

    // Read the file from the temporary directory
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = file.originalFilename || 'uploaded-file';
    const newFileName = `${Date.now()}-${fileName}`;

    // Define S3 upload parameters with ACL: 'public-read'
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: newFileName,
      Body: fileBuffer,
      ContentType: file.mimetype || 'application/octet-stream',
      ACL: 'public-read', // Enabled ACL for public read access
      ServerSideEncryption: 'AES256'
    };

    // Create and send the PutObject command
    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    // Construct the file URL
    // const url = `https://${uploadParams.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
    // console.log(url)
    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: newFileName,
    });
    
    const signedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });


    // Delete the temporary file after upload
    fs.unlinkSync(file.filepath);

    // Respond with the file URL
    res.status(200).json({ signedUrl });
  } catch (error: any) {
    console.error('Upload Error:', error);

    // Handle specific errors if needed
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
};

export default handler;