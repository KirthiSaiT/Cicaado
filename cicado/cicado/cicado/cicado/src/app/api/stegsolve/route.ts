import { NextResponse } from 'next/server';
import sharp from 'sharp';

interface RGBChannel {
  red: number[][];
  green: number[][];
  blue: number[][];
}

interface BitPlane {
  plane: number;
  red: number[][];
  green: number[][];
  blue: number[][];
}

interface AnalysisResult {
  filename: string;
  dimensions: { width: number; height: number };
  rgbChannels: RGBChannel;
  bitPlanes: BitPlane[];
  lsbAnalysis: {
    red: number[][];
    green: number[][];
    blue: number[][];
  };
  timestamp: string;
}

function extractBitPlane(value: number, bitPosition: number): number {
  return (value >> bitPosition) & 1;
}

function extractLSB(value: number): number {
  return value & 1;
}

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

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process image with Sharp
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      );
    }

    // Get raw pixel data
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });
    
    // Initialize arrays for RGB channels
    const redChannel: number[][] = [];
    const greenChannel: number[][] = [];
    const blueChannel: number[][] = [];

    // Extract RGB channels
    for (let y = 0; y < metadata.height; y++) {
      redChannel[y] = [];
      greenChannel[y] = [];
      blueChannel[y] = [];
      
      for (let x = 0; x < metadata.width; x++) {
        const index = (y * metadata.width + x) * 3;
        redChannel[y][x] = data[index];
        greenChannel[y][x] = data[index + 1];
        blueChannel[y][x] = data[index + 2];
      }
    }

    // Extract bit planes (0-7) for each channel
    const bitPlanes: BitPlane[] = [];
    for (let bit = 0; bit < 8; bit++) {
      const redPlane: number[][] = [];
      const greenPlane: number[][] = [];
      const bluePlane: number[][] = [];

      for (let y = 0; y < metadata.height; y++) {
        redPlane[y] = [];
        greenPlane[y] = [];
        bluePlane[y] = [];
        
        for (let x = 0; x < metadata.width; x++) {
          redPlane[y][x] = extractBitPlane(redChannel[y][x], bit);
          greenPlane[y][x] = extractBitPlane(greenChannel[y][x], bit);
          bluePlane[y][x] = extractBitPlane(blueChannel[y][x], bit);
        }
      }

      bitPlanes.push({
        plane: bit,
        red: redPlane,
        green: greenPlane,
        blue: bluePlane
      });
    }

    // Extract LSB (Least Significant Bit) for steganography detection
    const lsbRed: number[][] = [];
    const lsbGreen: number[][] = [];
    const lsbBlue: number[][] = [];

    for (let y = 0; y < metadata.height; y++) {
      lsbRed[y] = [];
      lsbGreen[y] = [];
      lsbBlue[y] = [];
      
      for (let x = 0; x < metadata.width; x++) {
        lsbRed[y][x] = extractLSB(redChannel[y][x]);
        lsbGreen[y][x] = extractLSB(greenChannel[y][x]);
        lsbBlue[y][x] = extractLSB(blueChannel[y][x]);
      }
    }

    // Create analysis result
    const result: AnalysisResult = {
      filename: file.name,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      rgbChannels: {
        red: redChannel,
        green: greenChannel,
        blue: blueChannel
      },
      bitPlanes: bitPlanes,
      lsbAnalysis: {
        red: lsbRed,
        green: lsbGreen,
        blue: lsbBlue
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 