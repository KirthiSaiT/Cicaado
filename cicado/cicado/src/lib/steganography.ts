/**
 * Steganography Analysis Utilities
 * 
 * This file contains utility functions for analyzing images for hidden steganographic data.
 * It includes functions for RGB channel analysis, bit plane extraction, and LSB analysis.
 */

export interface RGBChannel {
  red: number[][];
  green: number[][];
  blue: number[][];
}

export interface BitPlane {
  plane: number;
  red: number[][];
  green: number[][];
  blue: number[][];
}

export interface LSBData {
  red: number[][];
  green: number[][];
  blue: number[][];
}

/**
 * Extract a specific bit from a number
 * @param value - The pixel value (0-255)
 * @param bitPosition - The bit position (0-7)
 * @returns The bit value (0 or 1)
 */
export function extractBit(value: number, bitPosition: number): number {
  return (value >> bitPosition) & 1;
}

/**
 * Extract the Least Significant Bit (LSB) from a pixel value
 * @param value - The pixel value (0-255)
 * @returns The LSB value (0 or 1)
 */
export function extractLSB(value: number): number {
  return value & 1;
}

/**
 * Convert a bit plane to a visual representation
 * @param bitPlane - 2D array of bit values (0 or 1)
 * @returns 2D array of pixel values (0 or 255)
 */
export function bitPlaneToPixels(bitPlane: number[][]): number[][] {
  return bitPlane.map(row => row.map(bit => bit * 255));
}

/**
 * Analyze the distribution of bits in a bit plane
 * @param bitPlane - 2D array of bit values
 * @returns Object with statistics about the bit distribution
 */
export function analyzeBitPlane(bitPlane: number[][]): {
  totalBits: number;
  ones: number;
  zeros: number;
  onesPercentage: number;
  pattern: string;
} {
  const flatBits = bitPlane.flat();
  const totalBits = flatBits.length;
  const ones = flatBits.filter(bit => bit === 1).length;
  const zeros = totalBits - ones;
  const onesPercentage = (ones / totalBits) * 100;

  // Detect patterns (simple analysis)
  let pattern = 'random';
  if (onesPercentage > 60) pattern = 'mostly_ones';
  else if (onesPercentage < 40) pattern = 'mostly_zeros';
  else if (onesPercentage === 50) pattern = 'balanced';

  return {
    totalBits,
    ones,
    zeros,
    onesPercentage,
    pattern
  };
}

/**
 * Detect potential steganographic data in LSB
 * @param lsbData - LSB data for all channels
 * @returns Analysis results
 */
export function detectSteganography(lsbData: LSBData): {
  suspicious: boolean;
  redAnalysis: {
    totalBits: number;
    ones: number;
    zeros: number;
    onesPercentage: number;
    pattern: string;
  };
  greenAnalysis: {
    totalBits: number;
    ones: number;
    zeros: number;
    onesPercentage: number;
    pattern: string;
  };
  blueAnalysis: {
    totalBits: number;
    ones: number;
    zeros: number;
    onesPercentage: number;
    pattern: string;
  };
  recommendations: string[];
} {
  const redAnalysis = analyzeBitPlane(lsbData.red);
  const greenAnalysis = analyzeBitPlane(lsbData.green);
  const blueAnalysis = analyzeBitPlane(lsbData.blue);

  const recommendations: string[] = [];
  let suspicious = false;

  // Check for unusual patterns
  [redAnalysis, greenAnalysis, blueAnalysis].forEach((analysis, index) => {
    const channelName = ['Red', 'Green', 'Blue'][index];
    
    if (analysis.pattern !== 'random') {
      suspicious = true;
      recommendations.push(`${channelName} channel shows ${analysis.pattern} pattern (${analysis.onesPercentage.toFixed(1)}% ones)`);
    }
    
    if (analysis.onesPercentage > 70 || analysis.onesPercentage < 30) {
      recommendations.push(`${channelName} channel has unusual bit distribution`);
    }
  });

  if (!suspicious) {
    recommendations.push('No obvious steganographic patterns detected');
  }

  return {
    suspicious,
    redAnalysis,
    greenAnalysis,
    blueAnalysis,
    recommendations
  };
}

/**
 * Generate a summary of the analysis
 * @param analysisResult - Complete analysis result
 * @returns Summary string
 */
export function generateAnalysisSummary(analysisResult: {
  dimensions: { width: number; height: number };
  lsbAnalysis: LSBData;
}): string {
  const stegoDetection = detectSteganography(analysisResult.lsbAnalysis);
  
  let summary = `Image Analysis Summary:\n`;
  summary += `Dimensions: ${analysisResult.dimensions.width}x${analysisResult.dimensions.height}\n`;
  summary += `Total pixels: ${analysisResult.dimensions.width * analysisResult.dimensions.height}\n\n`;
  
  summary += `LSB Analysis:\n`;
  summary += `Red channel: ${stegoDetection.redAnalysis.onesPercentage.toFixed(1)}% ones\n`;
  summary += `Green channel: ${stegoDetection.greenAnalysis.onesPercentage.toFixed(1)}% ones\n`;
  summary += `Blue channel: ${stegoDetection.blueAnalysis.onesPercentage.toFixed(1)}% ones\n\n`;
  
  summary += `Recommendations:\n`;
  stegoDetection.recommendations.forEach(rec => {
    summary += `• ${rec}\n`;
  });
  
  return summary;
} 