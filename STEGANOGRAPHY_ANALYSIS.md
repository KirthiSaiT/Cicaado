# Advanced Steganography Analysis

This project now includes comprehensive steganography analysis capabilities with AI-powered insights.

## Features

### 🔍 **RGB Channel Analysis**
- **Red Channel**: Isolated red component analysis
- **Green Channel**: Isolated green component analysis  
- **Blue Channel**: Isolated blue component analysis
- Real-time channel visualization on canvas

### 🔢 **Bit Plane Analysis**
- **8 Bit Planes** (0-7) for each RGB channel
- **LSB (Least Significant Bit)** analysis for steganography detection
- Bit distribution statistics and pattern detection
- Visual representation of each bit plane

### 🤖 **AI Chat Integration**
- **DeepSeek Model** integration via LM Studio
- Context-aware analysis suggestions
- Real-time chat with AI assistant
- Steganography detection recommendations

## How to Use

### 1. **Setup LM Studio**
1. Download and install [LM Studio](https://lmstudio.ai/)
2. Load your DeepSeek model
3. Start the local API server (usually on port 1234)
4. Ensure the model is ready for inference

### 2. **Access the Analysis Tool**
1. Navigate to `/steganalysis` in your application
2. Upload an image (PNG, JPG, JPEG, BMP supported)
3. Wait for the analysis to complete

### 3. **Analyze Results**
- **Channel View**: Switch between Red, Green, Blue channels
- **LSB Analysis**: Toggle LSB visualization for steganography detection
- **Bit Plane Stats**: View distribution of ones/zeros in each bit plane
- **AI Chat**: Ask questions about the analysis results

### 4. **AI Chat Examples**
```
User: "What patterns do you see in the LSB analysis?"
AI: "I can see unusual patterns in the blue channel LSB..."

User: "Is there hidden data in this image?"
AI: "Based on the bit distribution analysis..."

User: "What should I investigate further?"
AI: "I recommend focusing on the red channel bit plane 0..."
```

## Technical Implementation

### Backend API (`/api/stegsolve`)
- **Sharp library** for image processing
- **RGB channel extraction** from raw pixel data
- **Bit plane analysis** (8 planes per channel)
- **LSB extraction** for steganography detection

### Frontend Components
- **Canvas rendering** for channel visualization
- **Real-time updates** based on user selections
- **Chat interface** with AI integration
- **Responsive design** for mobile/desktop

### AI Integration (`/api/chat`)
- **LM Studio API** connection (localhost:1234)
- **Context injection** with analysis results
- **Conversation history** maintenance
- **Error handling** for offline scenarios

## Analysis Types

### **RGB Channel Analysis**
```typescript
interface RGBChannel {
  red: number[][];    // Red channel pixel values
  green: number[][];  // Green channel pixel values
  blue: number[][];   // Blue channel pixel values
}
```

### **Bit Plane Analysis**
```typescript
interface BitPlane {
  plane: number;      // Bit position (0-7)
  red: number[][];    // Red channel bit plane
  green: number[][];  // Green channel bit plane
  blue: number[][];   // Blue channel bit plane
}
```

### **LSB Analysis**
```typescript
interface LSBData {
  red: number[][];    // Red channel LSB
  green: number[][];  // Green channel LSB
  blue: number[][];   // Blue channel LSB
}
```

## Steganography Detection

The system analyzes:
1. **Bit distribution** in each channel
2. **Pattern detection** in LSB
3. **Unusual concentrations** of ones/zeros
4. **Cross-channel correlations**

### Detection Indicators
- **>70% ones** in LSB: Potential hidden data
- **<30% ones** in LSB: Potential hidden data
- **Non-random patterns**: Suspicious activity
- **Channel imbalances**: Unusual distributions

## Troubleshooting

### **LM Studio Connection Issues**
- Ensure LM Studio is running
- Check if API server is started (port 1234)
- Verify model is loaded and ready
- Check firewall settings

### **Image Analysis Errors**
- Ensure image format is supported
- Check image file size (max 10MB recommended)
- Verify image has valid RGB data

### **Performance Issues**
- Large images may take longer to process
- Consider resizing very large images
- Check browser memory usage

## Future Enhancements

- [ ] **Additional steganography algorithms** (F5, OutGuess)
- [ ] **Batch processing** for multiple images
- [ ] **Export analysis reports** (PDF, JSON)
- [ ] **Advanced pattern recognition** with machine learning
- [ ] **Steganography embedding** tools
- [ ] **Watermark detection** capabilities

## Dependencies

```json
{
  "sharp": "^0.32.0",
  "framer-motion": "^12.15.0",
  "react-dropzone": "^14.3.8"
}
```

## Contributing

To add new analysis features:
1. Extend the `AnalysisResult` interface
2. Add processing logic in `/api/stegsolve`
3. Update the frontend component
4. Add AI context for new features
5. Update documentation

---

**Note**: This tool is for educational and research purposes. Always ensure you have permission to analyze images. 