import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Create a temporary directory for processing
    const tempDir = join(process.cwd(), 'tmp');
    const tempFilePath = join(tempDir, file.name);

    // Convert File to Buffer and save it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(tempFilePath, buffer);

    // Run Stegsolve analysis
    // Note: This assumes Stegsolve is installed and available in the system
    const { stdout, stderr } = await execAsync(`stegsolve ${tempFilePath}`);

    if (stderr) {
      console.error('Stegsolve error:', stderr);
      return NextResponse.json(
        { error: 'Error analyzing image' },
        { status: 500 }
      );
    }

    // Process the output and return results
    const results = {
      filename: file.name,
      analysis: stdout,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 